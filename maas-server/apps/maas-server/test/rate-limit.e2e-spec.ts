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
import { LowercaseEmailPipe } from "@app/shared/pipes";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";
import { EMAIL_TOKEN } from "@app/shared/constants/emailServiceToken";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

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

  //   const testEmail = `testuser_${Date.now()}@example.com`;
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
        ThrottlerModule.forRoot({
          throttlers: [
            {
              ttl: 60000,
              limit: 5,
            },
          ],
        }),
      ],
      controllers: [AppController],
      providers: [
        AppService,
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

  //   async function findUser(email: string): Promise<User | null> {
  //     return userRepo.findOne({ where: { email } });
  //   }

  describe("Rate Limiting /api/login", () => {
    it("should allow requests up to the limit", async () => {
      const email = `ratelimit_${Date.now()}@example.com`;
      await createUser(email, testPassword, true);

      const responses: number[] = [];

      for (let i = 0; i < 10; i++) {
        const res = await request(app.getHttpServer())
          .post("/api/login")
          .send({ email, password: testPassword });

        responses.push(res.status);
      }

      // console.log(responses)

      expect(responses).toEqual([
        200, 200, 200, 200, 200, 429, 429, 429, 429, 429,
      ]);
    });
  });
});
