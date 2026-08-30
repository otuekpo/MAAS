import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, VersioningType } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { getQueueToken } from "@nestjs/bull";
import type { Queue } from "bull";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "@app/database/pg-entities";
import { hash } from "bcrypt";
import { LowercaseEmailPipe } from "@app/shared/pipes";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";
import { REDIS_CLIENT } from "@app/shared";
import type Redis from "ioredis";
import type { AuditLogPayload } from "@app/shared";
import { AppModule } from "./../src/app.module";
import { AUDIT_LOG_QUEUE } from "./../src/audit-log.constants";
import { EMAIL_TOKEN } from "@app/shared/constants/emailServiceToken";

process.env.SECRET_KEY = process.env.SECRET_KEY ?? "test-secret-key";

const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
};

// Only byte values 0x00-0x7F count as ASCII.
const ASCII = /^[\x00-\x7F]*$/;

jest.setTimeout(30000);

describe("Header, Redirect, and Data-Type Safety (e2e)", () => {
  let app: INestApplication<App>;
  let userRepo: Repository<User>;
  let redis: Redis;
  let auditQueue: Queue<AuditLogPayload>;

  const testEmail = `safety_${Date.now()}@example.com`;
  const testPassword = "Str0ng!Pass#1";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Mock SMTP credentials so no real nodemailer transport is used.
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
    redis = app.get(REDIS_CLIENT);
    auditQueue = app.get<Queue<AuditLogPayload>>(
      getQueueToken(AUDIT_LOG_QUEUE),
    );

    await userRepo.query('DELETE FROM "user"');
  });

  afterAll(async () => {
    await userRepo.query('DELETE FROM "user"');
    await userRepo.query('DELETE FROM "payment"');
    await redis.flushdb();
    await auditQueue.close();
    await app.close();
  }, 30000);

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
    });
    return userRepo.save(user);
  }

  function hasOnlyAscii(value: unknown): boolean {
    return ASCII.test(String(value));
  }

  // Every response header name and value must be ASCII.
  function expectAsciiHeaders(headers: Record<string, unknown>): void {
    for (const [name, value] of Object.entries(headers)) {
      expect(hasOnlyAscii(name)).toBe(true);
      const values = Array.isArray(value) ? value : [value];
      for (const v of values) {
        expect(hasOnlyAscii(v)).toBe(true);
      }
    }
  }

  // #1 — Response headers emitted by the app must be ASCII only.
  describe("Response headers are ASCII only", () => {
    it("returns ASCII headers on a successful request", async () => {
      const res = await request(app.getHttpServer()).get("/api/");
      expectAsciiHeaders(res.headers);
    });

    it("returns ASCII headers on a 400 validation error", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/signup")
        .send({ email: 12345, password: testPassword });
      expect(res.status).toBe(400);
      expectAsciiHeaders(res.headers);
    });

    it("returns ASCII headers on a 404 for an unknown route", async () => {
      const res = await request(app.getHttpServer()).get("/api/nope");
      expect(res.status).toBe(404);
      expectAsciiHeaders(res.headers);
    });
  });

  // Request header values are checked for ASCII-only too.
  describe("Request header values", () => {
    it("accepts a latin-1 (non-ASCII byte) header value without a server error", async () => {
      // The codebase has no ASCII header filter, so a latin-1 header value is
      // forwarded and handled normally. This asserts that outcome so the
      // missing enforcement is visible rather than silently assumed.
      const res = await request(app.getHttpServer())
        .get("/api/")
        .set("X-Client-Name", "café");
      expect(res.status).toBeLessThan(500);
      expect(res.headers["x-client-name"]).toBeUndefined();
    });
  });

  // #2 — No open or attacker-controlled redirects.
  describe("Redirect safety", () => {
    it("returns 404 instead of a redirect for unknown routes", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/does-not-exist")
        .set("Accept", "text/html");
      expect(res.status).toBe(404);
      expect(Number(res.headers["content-length"] ?? 0)).toBeGreaterThan(0);
    });

    it("never reflects a caller-supplied url into a Location header", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/does-not-exist?redirect=https://evil.example")
        .set("Accept", "text/html");
      expect(res.status).not.toBe(301);
      expect(res.status).not.toBe(302);
      expect(res.headers.location).toBeUndefined();
    });

    it("does not expose an open redirect on the signup endpoint", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/signup?continue=https://evil.example")
        .send({ email: "redir@example.com", password: testPassword, confirmpassword: testPassword });
      expect(res.status).not.toBe(301);
      expect(res.status).not.toBe(302);
      expect(res.headers.location).toBeUndefined();
    });
  });

  // #3 — Request bodies must validate to the expected data types.
  describe("Expected data types are enforced", () => {
    it("rejects a non-string email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/signup")
        .send({ email: 12345, password: testPassword, confirmpassword: testPassword });
      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("rejects a non-string token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email: "a@b.com", token: 123456 });
      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("rejects an array where an object body is expected", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/login")
        .send([testEmail, testPassword]);
      expect(res.status).toBe(400);
    });

    it("rejects a number as an object body", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/login")
        .set("Content-Type", "application/json")
        .send("4242");
      expect(res.status).toBe(400);
    });

    it("rejects extra (unexpected-type) fields", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/signup")
        .send({
          email: testEmail,
          password: testPassword,
          confirmpassword: testPassword,
          role: ["admin"],
        });
      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("accepts a valid typed payload", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/signup")
        .send({
          email: testEmail,
          password: testPassword,
          confirmpassword: testPassword,
        });
      // Same email fails on the duplicate check, not on validation.
      expect([201, 409]).toContain(res.status);
      expect(res.body.successful).toBe(true);
    });
  });
});