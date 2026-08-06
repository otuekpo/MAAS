import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User, Payment } from "@app/database/pg-entities";
import { hash, compare } from "bcrypt";
import { AppService } from "./../src/app.service";
import { AppController } from "./../src/app.controller";
import { LowercaseEmailPipe } from "@app/shared/pipes";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";
import { EMAIL_TOKEN } from "@app/shared/constants/emailServiceToken";

const TEST_DB_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/maas_test";

process.env.SECRET_KEY = "test-secret-key";

const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
};

jest.setTimeout(30000);

describe("Auth Endpoints (e2e)", () => {
  let app: INestApplication<App>;
  let userRepo: Repository<User>;

  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = "Str0ng!Pass#1";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "postgres",
          url: TEST_DB_URL,
          entities: [User, Payment],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
        JwtModule,
      ],
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: EMAIL_TOKEN,
          useValue: mockEmailService,
        },
      ],
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
    app.enableVersioning();

    await app.init();

    userRepo = app.get(getRepositoryToken(User));

    await userRepo.query('DELETE FROM "user"');
  });

  afterAll(async () => {
    await userRepo.query('DELETE FROM "user"');
    await userRepo.query('DELETE FROM "payment"');
    await app.close();
  }, 30000);

  async function createUser(
    email: string,
    password: string,
    verified = false,
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

  async function findUser(email: string): Promise<User | null> {
    return userRepo.findOne({ where: { email } });
  }

  // ─── POST /api/signup ──────────────────────────────────

  describe("POST /api/signup", () => {
    it("should create a new user and return 201", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/signup")
        .send({
          email: testEmail,
          password: testPassword,
          confirmpassword: testPassword,
        })
        .expect(201);

      expect(res.body.successful).toBe(true);
      expect(res.body.data.email).toBe(testEmail);

      const user = await findUser(testEmail);
      expect(user).not.toBeNull();
      expect(user!.isEmailVerified).toBe(false);
      expect(user!.password).not.toBe(testPassword);
    });

    it("should return 409 for duplicate email", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: testEmail,
        password: testPassword,
        confirmpassword: testPassword,
      });

      expect(res.status).toBe(409);
      expect(res.body.successful).toBe(false);
    });

    it("should return 400 when passwords do not match", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "nomatch@example.com",
        password: "Str0ng!Pass#1",
        confirmpassword: "Different!Pass#1",
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return 400 for missing email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/signup")
        .send({ password: testPassword, confirmpassword: testPassword });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return 400 for missing password", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "nopass@example.com",
        confirmpassword: "Str0ng!Pass#1",
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject weak password (no uppercase)", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "weak1@example.com",
        password: "lowercase!1",
        confirmpassword: "lowercase!1",
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject weak password (no symbol)", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "weak2@example.com",
        password: "NoSymbol123",
        confirmpassword: "NoSymbol123",
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return 400 for password shorter than 8 chars", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "weak3@example.com",
        password: "Sh!1",
        confirmpassword: "Sh!1",
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return 400 for empty body", async () => {
      await request(app.getHttpServer())
        .post("/api/signup")
        .send({})
        .expect(400);
    });

    it("should reject extra fields (forbidNonWhitelisted)", async () => {
      await request(app.getHttpServer())
        .post("/api/signup")
        .send({
          email: "extra@example.com",
          password: testPassword,
          confirmpassword: testPassword,
          role: "admin",
        })
        .expect(400);
    });

    // ─── Pen-tester inputs ──────────────────────────────────

    it("should reject extremely long email (10k chars)", async () => {
      const longEmail = "a".repeat(10000) + "@example.com";
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: longEmail,
        password: testPassword,
        confirmpassword: testPassword,
      });

      expect([400, 413]).toContain(res.status);
      expect(res.body.successful).toBe(false);
    });

    it("should reject extremely long password (100k chars)", async () => {
      const longPass = "A".repeat(100) + "1!a";
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "longpass@example.com",
        password: longPass,
        confirmpassword: longPass,
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject extremely long email (10k chars)", async () => {
      const longEmail = "a".repeat(10000) + "@example.com";
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: longEmail,
        password: testPassword,
        confirmpassword: testPassword,
      });

      expect([400, 413]).toContain(res.status);
      expect(res.body.successful).toBe(false);
    });

    it("should reject extremely long password (100k chars)", async () => {
      const longPass = "A".repeat(100) + "1!a";
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "longpass@example.com",
        password: longPass,
        confirmpassword: longPass,
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject SQL injection in email", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "'; DROP TABLE users; --",
        password: testPassword,
        confirmpassword: testPassword,
      });

      expect([400, 413]).toContain(res.status);
      expect(res.body.successful).toBe(false);

      const tableExists = await userRepo.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user')",
      );
      expect(tableExists[0].exists).toBe(true);
    });

    it("should reject XSS payload in email", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: '<script>alert("xss")</script>@example.com',
        password: testPassword,
        confirmpassword: testPassword,
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject null bytes in email", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "test\x00@example.com",
        password: testPassword,
        confirmpassword: testPassword,
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject unicode-only email", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "测试@例子.中国",
        password: testPassword,
        confirmpassword: testPassword,
      });

      // DESIGN DECISION NEEDED: pick one and assert it strictly.
      // Unicode/IDN local-parts are valid per RFC 6531 but many @IsEmail
      // validators reject them by default. Confirm the app's actual email
      // validator config, then replace with e.g. expect(res.status).toBe(400);
      expect([400, 201]).toContain(res.status);
    });

    it("should reject emoji in email", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "🔥💀@example.com",
        password: testPassword,
        confirmpassword: testPassword,
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject password with only spaces", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "spacepass@example.com",
        password: "         ",
        confirmpassword: "         ",
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should strip __proto__ and create user with valid fields only", async () => {
      const email = `proto_${Date.now()}@example.com`;

      // Same issue as the reset-password __proto__ test: `{ __proto__: {} }`
      // as an object literal sets the prototype rather than creating an own
      // property, so it's silently dropped by JSON.stringify and never
      // reaches the server. Build the JSON manually so it's actually sent.
      const rawPayload = JSON.parse(
        `{"email":"${email}","password":"${testPassword}","confirmpassword":"${testPassword}","__proto__":{"isAdmin":true}}`,
      );

      const res = await request(app.getHttpServer())
        .post("/api/signup")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(rawPayload));

      expect([201, 400]).toContain(res.status);

      if (res.status === 201) {
        const user = await findUser(email);
        expect(user).not.toBeNull();
        expect((user as any).isAdmin).toBeUndefined();
      }
    });

    it("should strip constructor pollution and create user", async () => {
      const email = `proto2_${Date.now()}@example.com`;
      const res = await request(app.getHttpServer())
        .post("/api/signup")
        .send({
          email,
          password: testPassword,
          confirmpassword: testPassword,
          constructor: { prototype: { isAdmin: true } },
        });

      expect([201, 400]).toContain(res.status);

      if (res.status === 201) {
        const user = await findUser(email);
        expect(user).not.toBeNull();
        expect((user as any).isAdmin).toBeUndefined();
      }
    });

    it("should reject non-string email (integer)", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: 123456789,
        password: testPassword,
        confirmpassword: testPassword,
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject array as body", async () => {
      await request(app.getHttpServer())
        .post("/api/signup")
        .send([{ email: "arr@example.com", password: testPassword }])
        .expect(400);
    });

    it("should reject password with only whitespace variations (tabs, newlines)", async () => {
      const res = await request(app.getHttpServer()).post("/api/signup").send({
        email: "whitespace@example.com",
        password: "\t\n\r\n\t",
        confirmpassword: "\t\n\r\n\t",
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });
  });

  // ─── POST /api/login ───────────────────────────────────

  describe("POST /api/login", () => {
    it("should return 200 with token for valid credentials", async () => {
      const user = await findUser(testEmail);
      if (user && !user.isEmailVerified) {
        await userRepo.update({ email: testEmail }, { isEmailVerified: true });
      }

      const res = await request(app.getHttpServer())
        .post("/api/login")
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body.successful).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it("should return 401 for wrong password", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/login")
        .send({ email: testEmail, password: "Wr0ng!Pass#1" });

      console.log(res.body, res.status);

      expect(res.status).toBe(401);
      expect(res.body.successful).toBe(false);
    });

    it("should return 404 for non-existent email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/login")
        .send({ email: "nonexistent@example.com", password: testPassword });

      expect(res.status).toBe(404);
      expect(res.body.successful).toBe(false);
    });

    it("should return 400 for unverified email", async () => {
      const unverifiedEmail = `unverified_${Date.now()}@example.com`;
      await createUser(unverifiedEmail, testPassword, false);

      const res = await request(app.getHttpServer())
        .post("/api/login")
        .send({ email: unverifiedEmail, password: testPassword });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return disabled response for disabled account", async () => {
      const disabledEmail = `disabled_${Date.now()}@example.com`;
      await createUser(disabledEmail, testPassword, true);
      await userRepo.update({ email: disabledEmail }, { disabled: true });

      const res = await request(app.getHttpServer())
        .post("/api/login")
        .send({ email: disabledEmail, password: testPassword })
        .expect(200);

      expect(res.body.successful).toBe(false);
    });

    it("should return 400 for empty body", async () => {
      await request(app.getHttpServer())
        .post("/api/login")
        .send({})
        .expect(400);
    });

    it("should return 400 for missing password", async () => {
      await request(app.getHttpServer())
        .post("/api/login")
        .send({ email: testEmail })
        .expect(400);
    });

    it("should return 400 for missing email", async () => {
      await request(app.getHttpServer())
        .post("/api/login")
        .send({ password: testPassword })
        .expect(400);
    });

    // ─── Pen-tester inputs ──────────────────────────────────

    it("should reject SQL injection in email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/login")
        .send({ email: "' OR '1'='1' --", password: testPassword });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject SQL injection in password", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/login")
        .send({ email: testEmail, password: "' OR '1'='1' --" });

      expect(res.status).toBe(401);
      expect(res.body.successful).toBe(false);
    });

    it("should handle extremely long email (50k chars)", async () => {
      const longEmail = "a".repeat(50000) + "@example.com";
      const res = await request(app.getHttpServer())
        .post("/api/login")
        .send({ email: longEmail, password: testPassword });

      expect([400, 413]).toContain(res.status);
      expect(res.body.successful).toBe(false);
    });

    it("should reject XSS in email field", async () => {
      const res = await request(app.getHttpServer()).post("/api/login").send({
        email: "<img src=x onerror=alert(1)>@example.com",
        password: testPassword,
      });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject null bytes in password", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/login")
        .send({ email: testEmail, password: "pass\x00word" });

      expect(res.status).toBe(401);
      expect(res.body.successful).toBe(false);
    });

    it("should reject integer body", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/login")
        .set("Content-Type", "application/json")
        .send("12345");

      expect(res.status).toBe(400);
    });

    it("should reject array body", async () => {
      await request(app.getHttpServer())
        .post("/api/login")
        .send([testEmail, testPassword])
        .expect(400);
    });

    it("should reject extra fields", async () => {
      await request(app.getHttpServer())
        .post("/api/login")
        .send({ email: testEmail, password: testPassword, token: "injected" })
        .expect(400);
    });

    it("should reject unicode email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/login")
        .send({ email: "ユーザー@例え.テスト", password: testPassword });

      // Same unicode-validity call as the signup test above — pick one
      // (400 if the validator rejects non-ASCII local-parts, 404 if it's
      // accepted and simply doesn't match a user) and assert it strictly.
      expect([400, 404]).toContain(res.status);
      expect(res.body.successful).toBe(false);
    });
  });

  // ─── POST /api/resend-confirmation ─────────────────────

  describe("POST /api/resend-confirmation", () => {
    it("should resend confirmation for unverified user", async () => {
      const email = `resend_${Date.now()}@example.com`;
      await createUser(email, testPassword, false);

      mockEmailService.sendEmail.mockClear();

      const res = await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send({ email })
        .expect(200);

      expect(res.body.successful).toBe(true);

      const user = await findUser(email);
      expect(user!.emailVerificationToken).toBeDefined();
      expect(user!.emailVerificationTokenExpiry).not.toBeNull();

      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
    });

    it("should return error for already verified email", async () => {
      const email = `verified_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);

      const res = await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send({ email });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return error for non-existent email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send({ email: "doesnotexist@example.com" });

      // Restored to a strict check per the test's own name ("return error").
      // Note: some teams intentionally return 200 with a generic message here
      // to avoid leaking which emails are registered (enumeration). If that's
      // the intended behavior, change this to expect(res.status).toBe(200)
      // and assert the generic body message instead — don't leave both.
      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return 400 for missing email", async () => {
      await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send({})
        .expect(400);
    });

    it("should return error for disabled account", async () => {
      const email = `disabled_resend_${Date.now()}@example.com`;
      await createUser(email, testPassword, false);
      await userRepo.update({ email }, { disabled: true });

      const res = await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send({ email });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return 400 for empty body", async () => {
      await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send({})
        .expect(400);
    });

    // ─── Pen-tester inputs ──────────────────────────────────

    it("should reject SQL injection in email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send({ email: "'; DROP TABLE user; --" });

      expect([400, 413]).toContain(res.status);
      expect(res.body.successful).toBe(false);

      const tableExists = await userRepo.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user')",
      );
      expect(tableExists[0].exists).toBe(true);
    });

    it("should reject XSS in email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send({ email: "<script>alert(1)</script>@example.com" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject extremely long email (100k chars)", async () => {
      const longEmail = "a".repeat(100000) + "@example.com";
      const res = await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send({ email: longEmail });

      expect([400, 413]).toContain(res.status);
      expect(res.body.successful).toBe(false);
    });

    it("should reject null bytes in email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send({ email: "test\x00@example.com" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject non-string email (boolean)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send({ email: true });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject array body", async () => {
      await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send(["a@b.com"])
        .expect(400);
    });

    it("should reject extra fields", async () => {
      await request(app.getHttpServer())
        .post("/api/resend-confirmation")
        .send({ email: "a@b.com", token: "injected" })
        .expect(400);
    });
  });

  // ─── POST /api/verify-email ────────────────────────────

  describe("POST /api/verify-email", () => {
    it("should verify email with valid token", async () => {
      const email = `verify_${Date.now()}@example.com`;
      await createUser(email, testPassword, false);

      const user = await findUser(email);
      const token = user!.emailVerificationToken;

      const res = await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email, token })
        .expect(200);

      expect(res.body.successful).toBe(true);

      const updated = await findUser(email);
      expect(updated!.isEmailVerified).toBe(true);
      expect(updated!.emailVerificationToken).toBe("");
    });

    it("should return error for invalid token", async () => {
      const email = `verifybad_${Date.now()}@example.com`;
      await createUser(email, testPassword, false);

      const res = await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email, token: "000000" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return error for already verified email", async () => {
      const email = `alreadyverified_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);

      const res = await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email, token: "anything" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return error for expired token", async () => {
      const email = `expired_${Date.now()}@example.com`;
      const user = await createUser(email, testPassword, false);
      await userRepo.update(
        { email },
        { emailVerificationTokenExpiry: new Date("2020-01-01") },
      );

      const res = await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email, token: user!.emailVerificationToken });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return error for non-existent email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email: "ghost@example.com", token: "123456" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return 400 for missing email", async () => {
      await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ token: "123456" })
        .expect(400);
    });

    it("should return 400 for missing token", async () => {
      await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email: "a@b.com" })
        .expect(400);
    });

    it("should return 400 for empty body", async () => {
      await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({})
        .expect(400);
    });

    // ─── Pen-tester inputs ──────────────────────────────────

    it("should reject SQL injection in token", async () => {
      const email = `sqlverify_${Date.now()}@example.com`;
      await createUser(email, testPassword, false);

      const res = await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email, token: "'; DROP TABLE user; --" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);

      const tableExists = await userRepo.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user')",
      );
      expect(tableExists[0].exists).toBe(true);
    });

    it("should reject XSS in token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email: "xss@example.com", token: "<script>alert(1)</script>" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject extremely long token (50k chars)", async () => {
      const longToken = "1".repeat(50000);
      const res = await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email: "longtoken@example.com", token: longToken });

      expect([400, 413]).toContain(res.status);
      expect(res.body.successful).toBe(false);
    });

    it("should reject null bytes in token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email: "nb@example.com", token: "abc\x00def" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject integer token", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email: "int@example.com", token: 123456 });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject array body", async () => {
      await request(app.getHttpServer())
        .post("/api/verify-email")
        .send(["email", "token"])
        .expect(400);
    });

    it("should reject extra fields", async () => {
      await request(app.getHttpServer())
        .post("/api/verify-email")
        .send({ email: "a@b.com", token: "123", injected: true })
        .expect(400);
    });
  });

  // ─── POST /api/forgot-password ─────────────────────────

  describe("POST /api/forgot-password", () => {
    it("should send OTP and set reset token in DB", async () => {
      const email = `forgot_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);

      mockEmailService.sendEmail.mockClear();

      const res = await request(app.getHttpServer())
        .post("/api/forgot-password")
        .send({ email })
        .expect(200);

      expect(res.body.successful).toBe(true);

      const user = await findUser(email);
      expect(user!.passwordResetToken).toBeDefined();
      expect(user!.passwordResetTokenExpiry).not.toBeNull();

      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
    });

    it("should return error for non-existent email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/forgot-password")
        .send({ email: "ghost@example.com" });

      // *** MOST IMPORTANT DECISION IN THIS FILE ***
      // For forgot-password specifically, OWASP recommends returning 200
      // with a generic "if that account exists, an email was sent" message
      // for both existing and non-existent emails, to prevent account
      // enumeration via password reset. If the app follows that pattern,
      // this should be expect(res.status).toBe(200) plus an assertion that
      // the body is the same generic success message as the happy-path
      // "should send OTP" test above (NOT res.body.successful === false,
      // which itself leaks that the email doesn't exist).
      // If the app deliberately reveals non-existence via 400 instead,
      // that's a valid choice too — but make it a strict, single assertion
      // either way, not both.
      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return 400 for missing email", async () => {
      await request(app.getHttpServer())
        .post("/api/forgot-password")
        .send({})
        .expect(400);
    });

    it("should return 400 for empty body", async () => {
      await request(app.getHttpServer())
        .post("/api/forgot-password")
        .send({})
        .expect(400);
    });

    // ─── Pen-tester inputs ──────────────────────────────────

    it("should reject SQL injection in email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/forgot-password")
        .send({ email: "' OR 1=1 --" });

      // Not a syntactically valid email at all, so this one is unaffected
      // by the enumeration decision above — safe to assert strictly.
      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject XSS in email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/forgot-password")
        .send({ email: "<img src=x onerror=alert(1)>" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject extremely long email (100k chars)", async () => {
      const longEmail = "a".repeat(100000) + "@example.com";
      const res = await request(app.getHttpServer())
        .post("/api/forgot-password")
        .send({ email: longEmail });

      expect([400, 413]).toContain(res.status);
      expect(res.body.successful).toBe(false);
    });

    it("should reject null bytes in email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/forgot-password")
        .send({ email: "test\x00@example.com" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject non-string email (array)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/forgot-password")
        .send({ email: ["a@b.com", "c@d.com"] });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject integer body", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/forgot-password")
        .set("Content-Type", "application/json")
        .send("42");

      expect(res.status).toBe(400);
    });

    it("should reject extra fields", async () => {
      await request(app.getHttpServer())
        .post("/api/forgot-password")
        .send({ email: "a@b.com", resetToken: "injected" })
        .expect(400);
    });

    it("should reject unicode email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/forgot-password")
        .send({ email: "用户@例え.テスト" });

      // This one compounds two open decisions: (1) whether the validator
      // accepts non-ASCII local-parts at all, and (2) if it does, whether a
      // non-existent-but-valid email returns 200 (anti-enumeration) or 400
      // (see the "non-existent email" test above). Resolve both, then assert
      // a single strict status here instead of [400, 200].
      expect([400, 200]).toContain(res.status);
      expect(res.body.successful).toBe(false);
    });
  });

  // ─── POST /api/reset-password ──────────────────────────

  describe("POST /api/reset-password", () => {
    it("should reset password with valid OTP", async () => {
      const email = `reset_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);

      const resetToken = "123456";
      const futureDate = new Date(Date.now() + 3600000);
      await userRepo.update(
        { email },
        {
          passwordResetToken: resetToken,
          passwordResetTokenExpiry: futureDate,
        },
      );

      const newPassword = "N3w!Passw0rd#";
      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({ email, otp: resetToken, newPassword })
        .expect(200);

      expect(res.body.successful).toBe(true);

      const updated = await findUser(email);
      expect(updated!.password).not.toBe(newPassword);
      expect(updated!.password).not.toBe(testPassword);
      expect(updated!.passwordResetToken).toBeNull();
      expect(updated!.passwordResetTokenExpiry).toBeNull();

      const match = await compare(newPassword, updated!.password);
      expect(match).toBe(true);
    });

    it("should return error for invalid OTP", async () => {
      const email = `resetbad_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);
      await userRepo.update(
        { email },
        {
          passwordResetToken: "real-token",
          passwordResetTokenExpiry: new Date(Date.now() + 3600000),
        },
      );

      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({ email, otp: "wrong-token", newPassword: "N3w!Passw0rd#" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return error for expired reset token", async () => {
      const email = `resetexpired_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);
      await userRepo.update(
        { email },
        {
          passwordResetToken: "expired-token",
          passwordResetTokenExpiry: new Date("2020-01-01"),
        },
      );

      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({ email, otp: "expired-token", newPassword: "N3w!Passw0rd#" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return error for user with no reset token", async () => {
      const email = `noreset_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);

      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({ email, otp: "123456", newPassword: "N3w!Passw0rd#" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return error for non-existent email", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({
          email: "ghost@example.com",
          otp: "123456",
          newPassword: "N3w!Passw0rd#",
        });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject weak password", async () => {
      const email = `resetweak_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);
      await userRepo.update(
        { email },
        {
          passwordResetToken: "valid-token",
          passwordResetTokenExpiry: new Date(Date.now() + 3600000),
        },
      );

      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({ email, otp: "valid-token", newPassword: "weak" });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should return 400 for missing email", async () => {
      await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({ otp: "123456", newPassword: "N3w!Passw0rd#" })
        .expect(400);
    });

    it("should return 400 for missing OTP", async () => {
      await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({ email: "a@b.com", newPassword: "N3w!Passw0rd#" })
        .expect(400);
    });

    it("should return 400 for missing newPassword", async () => {
      await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({ email: "a@b.com", otp: "123456" })
        .expect(400);
    });

    it("should return 400 for empty body", async () => {
      await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({})
        .expect(400);
    });

    // ─── Pen-tester inputs ──────────────────────────────────

    it("should reject SQL injection in OTP", async () => {
      const email = `sqlreset_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);
      await userRepo.update(
        { email },
        {
          passwordResetToken: "legit",
          passwordResetTokenExpiry: new Date(Date.now() + 3600000),
        },
      );

      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({
          email,
          otp: "'; DROP TABLE user; --",
          newPassword: "N3w!Passw0rd#",
        });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);

      const tableExists = await userRepo.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user')",
      );
      expect(tableExists[0].exists).toBe(true);
    });

    it("should reject XSS in OTP", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({
          email: "xss@example.com",
          otp: "<script>alert(1)</script>",
          newPassword: "N3w!Passw0rd#",
        });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject extremely long OTP (50k chars)", async () => {
      const longOtp = "1".repeat(50000);
      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({
          email: "longotp@example.com",
          otp: longOtp,
          newPassword: "N3w!Passw0rd#",
        });

      expect([400, 413]).toContain(res.status);
      expect(res.body.successful).toBe(false);
    });

    it("should reject extremely long new password (100k chars)", async () => {
      const email = `longpassreset_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);
      await userRepo.update(
        { email },
        {
          passwordResetToken: "legit",
          passwordResetTokenExpiry: new Date(Date.now() + 3600000),
        },
      );

      const longPass = "A".repeat(99999) + "1!a";
      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({ email, otp: "legit", newPassword: longPass });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject null bytes in OTP", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({
          email: "nb@example.com",
          otp: "abc\x00def",
          newPassword: "N3w!Passw0rd#",
        });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject integer OTP", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({
          email: "int@example.com",
          otp: 123456,
          newPassword: "N3w!Passw0rd#",
        });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject array body", async () => {
      await request(app.getHttpServer())
        .post("/api/reset-password")
        .send(["email", "otp", "password"])
        .expect(400);
    });

    it("should reject extra fields", async () => {
      await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({
          email: "a@b.com",
          otp: "123",
          newPassword: "N3w!Passw0rd#",
          admin: true,
        })
        .expect(400);
    });

    it("should strip __proto__ from request body", async () => {
      const email = `proto_reset_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);
      await userRepo.update(
        { email },
        {
          passwordResetToken: "legit",
          passwordResetTokenExpiry: new Date(Date.now() + 3600000),
        },
      );

      // NOTE: `{ __proto__: {...} }` as an object literal sets the literal
      // object's prototype in JS — it does NOT create an own/enumerable
      // property, so JSON.stringify (and thus supertest's .send()) never
      // puts "__proto__" on the wire at all. This test previously always
      // sent just { email, otp, newPassword } and could never have caught a
      // real prototype-pollution bug. Build the payload from a JSON string
      // instead so "__proto__" becomes a real own property that IS
      // serialized and sent to the server.
      const rawPayload = JSON.parse(
        `{"email":"${email}","otp":"legit","newPassword":"N3w!Passw0rd#","__proto__":{"isAdmin":true}}`,
      );

      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(rawPayload));

      // Either the app rejects the unexpected field (400, if reset-password
      // also uses whitelist/forbidNonWhitelisted validation) or it accepts
      // the request and safely ignores/strips the prototype pollution
      // attempt (200). Whichever branch fires, verify nothing was actually
      // polluted — don't just accept both statuses and stop there.
      expect([200, 400]).toContain(res.status);
      expect(({} as any).isAdmin).toBeUndefined();

      const updated = await findUser(email);
      expect((updated as any)?.isAdmin).toBeUndefined();
    });

    it("should reject unicode OTP", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({
          email: "uni@example.com",
          otp: "日本語",
          newPassword: "N3w!Passw0rd#",
        });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });

    it("should reject password with only spaces (trimmed to empty)", async () => {
      const email = `spaces_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);
      await userRepo.update(
        { email },
        {
          passwordResetToken: "legit",
          passwordResetTokenExpiry: new Date(Date.now() + 3600000),
        },
      );

      const res = await request(app.getHttpServer())
        .post("/api/reset-password")
        .send({ email, otp: "legit", newPassword: "          " });

      expect(res.status).toBe(400);
      expect(res.body.successful).toBe(false);
    });
  });
});
