import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "@app/database/pg-entities";
import { hash } from "bcrypt";
import { getQueueToken } from "@nestjs/bull";
import type { Queue } from "bull";
import { AppModule } from "./../src/app.module";
import { AUDIT_LOG_QUEUE } from "./../src/audit-log.constants";
import { LowercaseEmailPipe } from "@app/shared/pipes";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";
import { REDIS_CLIENT } from "@app/shared";
import type { AuditLogPayload } from "@app/shared";
import type Redis from "ioredis";

jest.setTimeout(30000);

describe("Audit Logging Interceptor (e2e)", () => {
  let app: INestApplication<App>;
  let userRepo: Repository<User>;
  let redis: Redis;
  let auditQueue: Queue<AuditLogPayload>;

  const testPassword = "Str0ng!Pass#1";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    redis = app.get(REDIS_CLIENT);
    auditQueue = app.get<Queue<AuditLogPayload>>(
      getQueueToken(AUDIT_LOG_QUEUE),
    );

    await userRepo.query('DELETE FROM "user"');
  });

  afterAll(async () => {
    await userRepo.query('DELETE FROM "user"');
    await userRepo.query('DELETE FROM "payment"');
    await auditQueue.empty();
    await auditQueue.close();
    await redis.quit();
    await app.close();
  }, 30000);

  beforeEach(async () => {
    await auditQueue.empty();
  });

  async function createUser(
    email: string,
    password: string,
    verified = true,
  ): Promise<User> {
    const hashed = await hash(password, 10);
    const user = userRepo.create({
      email,
      password: hashed,
      isEmailVerified: verified,
      emailVerificationToken: verified ? "" : "valid-token",
      emailVerificationTokenExpiry: verified
        ? null
        : new Date(Date.now() + 3600000),
    });
    return userRepo.save(user);
  }

  async function waitForJob(
    predicate: (job: AuditLogPayload) => boolean,
  ): Promise<AuditLogPayload> {
    for (let i = 0; i < 50; i++) {
      const waiting = await auditQueue.getWaiting();
      const match = waiting.find((job) => predicate(job.data));
      if (match) {
        return match.data;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Timed out waiting for audit log job");
  }

  it("enqueues a sanitized audit job for an anonymous login", async () => {
    const email = `audit_login_${Date.now()}@example.com`;
    await createUser(email, testPassword, true);

    const res = await request(app.getHttpServer())
      .post("/api/login")
      .send({ email, password: testPassword })
      .expect(200);

    expect(res.body.data.token).toBeDefined();

    const job = await waitForJob((data) => data.action === "POST /api/login");
    expect(job).toMatchObject({
      email,
      method: "POST",
      path: "/api/login",
      module: "Auth",
      status: "success",
      status_code: 200,
    });
    expect(job.duration_ms).toEqual(expect.any(Number));
    expect(job.user_id).toBeUndefined();
    expect(job.data).toBeDefined();
    expect(job.data!.token).toBe("[REDACTED]");
  });

  it("enqueues a failed audit job when login credentials are invalid", async () => {
    const email = `audit_failed_${Date.now()}@example.com`;
    await createUser(email, testPassword, true);

    await request(app.getHttpServer())
      .post("/api/login")
      .send({ email, password: "WrongPass#1" })
      .expect(401);

    const job = await waitForJob((data) => data.action === "POST /api/login");
    expect(job).toMatchObject({
      email,
      module: "Auth",
      status: "failed",
      status_code: 401,
    });
  });

  it("enqueues an audit job with the user id for authenticated requests", async () => {
    const email = `audit_details_${Date.now()}@example.com`;
    const user = await createUser(email, testPassword, true);

    const login = await request(app.getHttpServer())
      .post("/api/login")
      .send({ email, password: testPassword })
      .expect(200);
    const token = login.body.data.token;

    const res = await request(app.getHttpServer())
      .get("/api/details")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.id).toBe(user.id);

    const job = await waitForJob((data) => data.action === "GET /api/details");
    expect(job).toMatchObject({
      user_id: user.id,
      email,
      method: "GET",
      path: "/api/details",
      module: "Profile",
      status: "success",
      status_code: 200,
    });
    expect(job.data).toBeDefined();
  });
});
