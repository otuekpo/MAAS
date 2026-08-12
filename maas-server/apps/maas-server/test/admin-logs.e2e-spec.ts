import "./setup-admin-logs-env";
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
import { Logs, LogsSchema, Trips } from "@app/database/mongodb";
import { LowercaseEmailPipe } from "@app/shared/pipes";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";
import { REDIS_CLIENT } from "@app/shared";
import type Redis from "ioredis";
import { AppModule } from "./../src/app.module";
import { AuditLogProcessor } from "./../../injestion/src/audit-log.processor";
import { EMAIL_TOKEN } from "@app/shared/constants/emailServiceToken";

const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
};

jest.setTimeout(12000000);

describe("Admin Log Endpoints (e2e)", () => {
  let app: INestApplication<App>;
  let userRepo: Repository<User>;
  let jwtService: JwtService;
  let logsModel: Model<Logs>;
  let tripsModel: Model<Trips>;
  let redis: Redis;

  const testPassword = "Str0ng!Pass#1";

  beforeAll(async () => {
    // The suite runs the real AppModule plus the real AuditLogProcessor, so
    // log records are produced by real API calls flowing through the real
    // interceptor -> queue -> processor pipeline.
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
    tripsModel = app.get<Model<Trips>>(getModelToken(Trips.name));
    redis = app.get(REDIS_CLIENT);

    await userRepo.query('DELETE FROM "user"');
  });

  afterAll(async () => {
    await logsModel.deleteMany({});
    await tripsModel.deleteMany({});
    await userRepo.query('DELETE FROM "user"');
    await userRepo.query('DELETE FROM "payment"');
    await redis.flushdb();
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
        id: `admin-${role}-${Date.now()}`,
        email: `admin${role}@maas.test`,
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

  it("rejects non-admin users with 403", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/logs")
      .set("Authorization", `Bearer ${generateToken(0)}`)
      .expect(403);
  });

  it("returns paginated logs sorted newest first for an admin", async () => {
    const emails = [
      `page_a_${Date.now()}@example.com`,
      `page_b_${Date.now()}@example.com`,
      `page_c_${Date.now()}@example.com`,
    ];
    for (const email of emails) {
      await createUser(email, 0, testPassword);
      await login(email, testPassword).expect(200);
    }
    await waitForLogs({ module: "Auth" }, 3);

    const res = await request(app.getHttpServer())
      .get("/api/admin/logs?module=Auth&page=1&limit=2")
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(200);
    console.log(res.body)

    expect(res.body.successful).toBe(true);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(2);
    expect(res.body.data.totalPages).toBe(2);
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.data[0].email).toBe(emails[2]);
    expect(res.body.data.data[1].email).toBe(emails[1]);
  });

  it("filters logs by user email", async () => {
    const xEmail = `filter_x_${Date.now()}@example.com`;
    const yEmail = `filter_y_${Date.now()}@example.com`;
    await createUser(xEmail, 0, testPassword);
    await createUser(yEmail, 0, testPassword);

    await login(xEmail, testPassword).expect(200);
    await login(yEmail, "WrongPass#1").expect(401);

    await waitForLogs({ email: xEmail, status: "success" }, 1);
    await waitForLogs({ email: yEmail, status: "failed" }, 1);

    const res = await request(app.getHttpServer())
      .get(`/api/admin/logs?user=${xEmail}`)
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(200);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].email).toBe(xEmail);
    expect(res.body.data.data[0].status).toBe("success");
  });

  it("filters logs by action type (failed and blocked)", async () => {
    const email = `action_${Date.now()}@example.com`;
    await createUser(email, 0, testPassword);

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await login(email, "WrongPass#1");
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual(Array(5).fill(401));
    expect(statuses[5]).toBe(429);

    const failed = await waitForLogs({ email, status: "failed" }, 5);
    expect(failed).toHaveLength(5);

    const blocked = await waitForLogs({ email, status: "blocked" }, 1);
    // console.log(blocked)
    expect(blocked[0].status_code).toBe(429);
    // expect(blocked[0].message).toContain("Too many failed attempts");

    const failedRes = await request(app.getHttpServer())
      .get(`/api/admin/logs?actionType=failed&user=${email}`)
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(200);
    expect(failedRes.body.data.total).toBe(5);
    expect(
      failedRes.body.data.data.every((log: any) => log.status === "failed"),
    ).toBe(true);

    const blockedRes = await request(app.getHttpServer())
      .get(`/api/admin/logs?actionType=blocked&user=${email}`)
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(200);
    expect(blockedRes.body.data.total).toBe(1);
    expect(blockedRes.body.data.data[0].status).toBe("blocked");

    const csv = await request(app.getHttpServer())
      .get(`/api/admin/logs/export?actionType=blocked&user=${email}`)
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(200)
      .expect("Content-Type", /text\/csv/);
    expect(csv.text).toContain('"Too many failed attempts. Try again later."');
  });

  it("filters logs by module", async () => {
    const email = `module_${Date.now()}@example.com`;
    const user = await createUser(email, 0, testPassword);

    await login(email, testPassword).expect(200); // Auth

    const signed = jwtService.sign(
      { id: user.id, email: user.email, role: user.role },
      { secret: process.env.SECRET_KEY },
    );
    await request(app.getHttpServer())
      .get("/api/details")
      .set("Authorization", `Bearer ${signed}`)
      .expect(200); // Profile
    await request(app.getHttpServer())
      .post("/api/trips")
      .set("Authorization", `Bearer ${signed}`)
      .send({
        route: "Lagos - Abuja",
        transport: "bus",
        date: "2026-09-15T08:00:00.000Z",
        cost: 15000,
      })
      .expect(201); // Trips

    await waitForLogs({ email, module: "Auth" }, 1);
    await waitForLogs({ email, module: "Profile" }, 1);
    await waitForLogs({ email, module: "Trips" }, 1);

    const authRes = await request(app.getHttpServer())
      .get(`/api/admin/logs?module=Auth&user=${email}`)
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(200);
    expect(authRes.body.data.total).toBe(1);

    const profileRes = await request(app.getHttpServer())
      .get(`/api/admin/logs?module=Profile&user=${email}`)
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(200);
    expect(profileRes.body.data.total).toBe(1);

    const tripsRes = await request(app.getHttpServer())
      .get(`/api/admin/logs?module=Trips&user=${email}`)
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(200);
    expect(tripsRes.body.data.total).toBe(1);
  });

  it("filters logs by date range", async () => {
    const email = `date_${Date.now()}@example.com`;
    await createUser(email, 0, testPassword);
    await login(email, testPassword).expect(200);
    await waitForLogs({ email, module: "Auth" }, 1);

    const now = new Date();
    const from = new Date(now.getTime() - 60_000).toISOString();
    const to = new Date(now.getTime() + 60_000).toISOString();

    const res = await request(app.getHttpServer())
      .get(`/api/admin/logs?from=${from}&to=${to}`)
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(200);

    expect(res.body.data.total).toBe(1);
    expect(res.body.data.data[0].email).toBe(email);
  });

  it("returns a single log by id", async () => {
    const email = `detail_${Date.now()}@example.com`;
    await createUser(email, 0, testPassword);
    await login(email, testPassword).expect(200);

    const docs = await waitForLogs({ email }, 1);
    const id = (docs[0] as any)._id.toString();

    const res = await request(app.getHttpServer())
      .get(`/api/admin/logs/${id}`)
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(200);

    expect(res.body.successful).toBe(true);
    expect(res.body.data._id).toBe(id);
    expect(res.body.data.email).toBe(email);
    expect(res.body.data.status).toBe("success");
  });

  it("returns 400 for an invalid log id", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/logs/not-a-valid-id")
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(400);
  });

  it("returns 404 when the log does not exist", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/logs/507f1f77bcf86cd799439011")
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(404);
  });

  it("exports logs as CSV", async () => {
    const email = `export_${Date.now()}@example.com`;
    await createUser(email, 0, testPassword);
    await login(email, testPassword).expect(200);
    await waitForLogs({ email }, 1);

    const res = await request(app.getHttpServer())
      .get("/api/admin/logs/export")
      .set("Authorization", `Bearer ${generateToken(1)}`)
      .expect(200)
      .expect("Content-Type", /text\/csv/);

    expect(res.text).toContain("Timestamp,User,Action");
    expect(res.text).toContain("POST /api/login");
  });
});
