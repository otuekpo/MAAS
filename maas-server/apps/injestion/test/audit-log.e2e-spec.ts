import "./setup-audit-logs-env";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { getRepositoryToken } from "@nestjs/typeorm";
import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { Model } from "mongoose";
import { hash } from "bcrypt";
import { User } from "@app/database/pg-entities";
import { Logs, LogsSchema } from "@app/database/mongodb";
import { LowercaseEmailPipe } from "@app/shared/pipes";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";
import { REDIS_CLIENT } from "@app/shared";
import type Redis from "ioredis";
import { getQueueToken } from "@nestjs/bull";
import type { Queue } from "bull";
import { AppModule } from "../../maas-server/src/app.module";
import { AuditLogProcessor } from "./../src/audit-log.processor";
import { AUDIT_LOG_QUEUE } from "./../src/injestion.constants";
import type { AuditLogPayload } from "@app/shared";
import { EMAIL_TOKEN } from "@app/shared/constants/emailServiceToken";

const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
};

jest.setTimeout(12000000);

describe("AuditLogProcessor (e2e)", () => {
  let app: INestApplication<App>;
  let userRepo: Repository<User>;
  let jwtService: JwtService;
  let logsModel: Model<Logs>;
  let redis: Redis;
  let auditQueue: Queue<AuditLogPayload>;

  const testPassword = "Str0ng!Pass#1";

  beforeAll(async () => {
    // The suite boots the real maas-server AppModule (real controllers +
    // real AuditLogInterceptor + real Bull queue) together with the real
    // injestion AuditLogProcessor, so every log document is produced by real
    // API calls flowing through the real interceptor -> queue -> processor
    // pipeline. No seeded jobs.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        // The AuditLogProcessor runs in this suite, so the Logs model must be
        // resolvable from the RootTestModule scope (AppModule does not
        // re-export it).
        MongooseModule.forFeature([{ name: Logs.name, schema: LogsSchema }]),
      ],
      providers: [AuditLogProcessor],
    })
      // Mock SMTP credentials: no real nodemailer transport is configured or
      // used in this suite.
      .overrideProvider(EMAIL_TOKEN)
      .useValue(mockEmailService)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
      new LowercaseEmailPipe(),
    );

    app.useGlobalInterceptors(
      new ErrorResponseInterceptor(),
      new TrimInterceptor(),
    );

    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI });

    await app.init();

    userRepo = app.get(getRepositoryToken(User));
    jwtService = app.get(JwtService);
    logsModel = app.get<Model<Logs>>(getModelToken(Logs.name));
    redis = app.get(REDIS_CLIENT);
    auditQueue = app.get<Queue<AuditLogPayload>>(
      getQueueToken(AUDIT_LOG_QUEUE),
    );

    await userRepo.query('DELETE FROM "user"');
  });

  afterAll(async () => {
    await logsModel.deleteMany({});
    await userRepo.query('DELETE FROM "user"');
    await userRepo.query('DELETE FROM "payment"');
    await redis.flushdb();
    await auditQueue.close();
    await app.close();
  }, 30000);

  beforeEach(async () => {
    // Drop pending audit jobs, let any in-flight processor write settle, then
    // start each test with an empty Logs collection and a clean Redis
    // (brute-force counters, throttle counters, and the audit queue).
    await redis.flushdb();
    await new Promise((resolve) => setTimeout(resolve, 200));
    await logsModel.deleteMany({});
  });

  function generateToken(role: number): string {
    return jwtService.sign(
      {
        id: `audit-inj-${role}-${Date.now()}`,
        email: `audit-inj${role}@maas.test`,
        role,
      },
      { secret: process.env.SECRET_KEY },
    );
  }

  async function createUser(
    email: string,
    role: number,
    password: string,
  ): Promise<User> {
    const hashed = await hash(password, 10);
    const user = userRepo.create({
      email,
      password: hashed,
      isEmailVerified: true,
      role,
    });
    return userRepo.save(user);
  }

  function login(email: string, password: string) {
    return request(app.getHttpServer())
      .post("/api/login")
      .send({ email, password });
  }

  async function waitForLogs(
    filter: Record<string, unknown>,
    count: number,
  ): Promise<any[]> {
    for (let i = 0; i < 100; i++) {
      const docs = await logsModel.find(filter as any).lean();
      if (docs.length >= count) {
        return docs;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(
      `Timed out waiting for ${count} log(s) matching ${JSON.stringify(filter)}`,
    );
  }

  it("records a successful login via the real pipeline", async () => {
    const email = `inj_success_${Date.now()}@example.com`;
    await createUser(email, 0, testPassword);

    const res = await login(email, testPassword).expect(200);
    expect(res.body.data.token).toBeDefined();

    const docs = await waitForLogs({ email, status: "success" }, 1);
    expect(docs[0]).toMatchObject({
      email,
      method: "POST",
      path: "/api/login",
      module: "Auth",
      action: "POST /api/login",
      status: "success",
      status_code: 200,
    });
    expect(docs[0].duration_ms).toEqual(expect.any(Number));
    expect(docs[0].user_id).toBeUndefined();
    expect(docs[0].data).toBeDefined();
    expect(docs[0].data!.token).toBe("[REDACTED]");
  });

  it("records a failed login via the real pipeline", async () => {
    const email = `inj_failed_${Date.now()}@example.com`;
    await createUser(email, 0, testPassword);

    await login(email, "WrongPass#1").expect(401);

    const docs = await waitForLogs({ email, status: "failed" }, 1);
    expect(docs[0]).toMatchObject({
      email,
      module: "Auth",
      status: "failed",
      status_code: 401,
    });
  });

  it("records a blocked login after repeated failures", async () => {
    const email = `inj_blocked_${Date.now()}@example.com`;
    await createUser(email, 0, testPassword);

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await login(email, "WrongPass#1");
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual(Array(5).fill(401));
    expect(statuses[5]).toBe(429);

    const blocked = await waitForLogs({ email, status: "blocked" }, 1);
    expect(blocked[0].status_code).toBe(429);
    expect(blocked[0].status).toBe("blocked");
  });

  it("records the user identity for an authenticated request", async () => {
    const email = `inj_details_${Date.now()}@example.com`;
    const user = await createUser(email, 0, testPassword);

    const token = jwtService.sign(
      { id: user.id, email: user.email, role: user.role },
      { secret: process.env.SECRET_KEY },
    );
    await request(app.getHttpServer())
      .get("/api/details")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const docs = await waitForLogs({ email, module: "Profile" }, 1);
    expect(docs[0]).toMatchObject({
      user_id: user.id,
      email,
      method: "GET",
      path: "/api/details",
      module: "Profile",
      status: "success",
      status_code: 200,
    });
  });

  it("persists exactly one log document per API call", async () => {
    const email = `inj_once_${Date.now()}@example.com`;
    await createUser(email, 0, testPassword);

    await login(email, testPassword).expect(200);
    await waitForLogs({ email, action: "POST /api/login" }, 1);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const docs = await logsModel.find({ email }).lean();
    expect(docs).toHaveLength(1);
  });
});
