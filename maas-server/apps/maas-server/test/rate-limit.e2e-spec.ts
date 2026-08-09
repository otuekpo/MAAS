import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User, Payment } from "@app/database/pg-entities";
import { hash } from "bcrypt";
import { AppService } from "./../src/app.service";
import { AppController } from "./../src/app.controller";
import { BruteForceService } from "./../src/brute-force.service";
import { LowercaseEmailPipe } from "@app/shared/pipes";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";
import { EMAIL_TOKEN } from "@app/shared/constants/emailServiceToken";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { RedisModule, REDIS_CLIENT } from "@app/shared";
import { APP_GUARD } from "@nestjs/core";
import Redis from "ioredis";

const TEST_DB_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/maas_test";

const TEST_REDIS_URL =
  process.env.REDIS_TEST_URL ?? "redis://localhost:6379/15";

process.env.REDIS_URL = TEST_REDIS_URL;
process.env.SECRET_KEY = "test-secret-key";
process.env.BRUTE_FORCE_MAX_ATTEMPTS = "5";
process.env.BRUTE_FORCE_WINDOW_SEC = "900";
process.env.BRUTE_FORCE_BLOCK_SEC = "900";

const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
};

jest.setTimeout(30000);

describe("Rate Limiting & Brute-force Protection (e2e)", () => {
  let app: INestApplication<App>;
  let userRepo: Repository<User>;
  let redis: Redis;

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
        RedisModule,
        ThrottlerModule.forRootAsync({
          inject: [REDIS_CLIENT],
          useFactory: (client: Redis) => ({
            throttlers: [
              {
                name: "default",
                ttl: 60000,
                limit: 100,
                blockDuration: 60000,
              },
            ],
            storage: new ThrottlerStorageRedisService(client),
          }),
        }),
      ],
      controllers: [AppController],
      providers: [
        AppService,
        BruteForceService,
        {
          provide: EMAIL_TOKEN,
          useValue: mockEmailService,
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
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
    redis = app.get(REDIS_CLIENT);

    await userRepo.query('DELETE FROM "user"');
  });

  afterAll(async () => {
    await userRepo.query('DELETE FROM "user"');
    await userRepo.query('DELETE FROM "payment"');
    await redis.flushdb();
    await redis.quit();
    await app.close();
  }, 30000);

  beforeEach(async () => {
    await redis.flushdb();
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

  async function attemptLogin(email: string, password: string) {
    return request(app.getHttpServer())
      .post("/api/login")
      .send({ email, password });
  }

  describe("Rate limiting (Redis-backed)", () => {
    it("should allow requests up to the route limit then return 429", async () => {
      const email = `ratelimit_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);

      const statuses: number[] = [];
      for (let i = 0; i < 21; i++) {
        const res = await attemptLogin(email, testPassword);
        statuses.push(res.status);
      }

      expect(statuses.slice(0, 20)).toEqual(Array(20).fill(200));
      expect(statuses[20]).toBe(429);
    });
  });

  describe("Brute-force protection (/api/login)", () => {
    it("should allow a successful login", async () => {
      const email = `brute_ok_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);

      const res = await attemptLogin(email, testPassword);
      expect(res.status).toBe(200);
    });

    it("should lock out an account after 5 consecutive wrong passwords", async () => {
      const email = `brute_lock_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);

      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await attemptLogin(email, "WrongPass#1");
        statuses.push(res.status);
      }

      expect(statuses.slice(0, 5)).toEqual(Array(5).fill(401));
      expect(statuses[5]).toBe(429);
    });

    it("should treat non-existent emails as failed attempts", async () => {
      const email = `brute_unknown_${Date.now()}@example.com`;

      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await attemptLogin(email, testPassword);
        statuses.push(res.status);
      }

      expect(statuses.slice(0, 5)).toEqual(Array(5).fill(404));
      expect(statuses[5]).toBe(429);
    });

    it("should reset the failure counter after a successful login", async () => {
      const email = `brute_reset_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);

      const firstFailures: number[] = [];
      for (let i = 0; i < 4; i++) {
        const res = await attemptLogin(email, "WrongPass#1");
        firstFailures.push(res.status);
      }
      expect(firstFailures).toEqual(Array(4).fill(401));

      const success = await attemptLogin(email, testPassword);
      expect(success.status).toBe(200);

      const secondFailures: number[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await attemptLogin(email, "WrongPass#1");
        secondFailures.push(res.status);
      }
      expect(secondFailures).toEqual(Array(5).fill(401));

      const locked = await attemptLogin(email, "WrongPass#1");
      expect(locked.status).toBe(429);
    });
  });
});
