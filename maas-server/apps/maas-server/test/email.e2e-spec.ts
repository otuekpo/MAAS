import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User, Payment } from "@app/database/pg-entities";
import { AppService } from "./../src/app.service";
import { AppController } from "./../src/app.controller";
import { LowercaseEmailPipe } from "@app/shared/pipes";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";
import { EmailModule } from "@app/email";

const TEST_DB_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/maas_test";

process.env.SECRET_KEY = "test-secret-key";

jest.setTimeout(30000);

describe("Email — Signup (e2e)", () => {
  let app: INestApplication<App>;
  let userRepo: Repository<User>;

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
        EmailModule,
      ],
      controllers: [AppController],
      providers: [AppService],
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
    await app.close();
  }, 30000);

  it("should signup and send a confirmation email", async () => {
    const testEmail = `maas_${Date.now()}@mailinator.com`;
    console.log(testEmail);
    const testPassword = "Str0ng!Pass#1";

    const res = await request(app.getHttpServer())
      .post("/api/signup")
      .send({
        email: testEmail,
        password: testPassword,
        confirmpassword: testPassword,
      })
      .expect(201);

    console.log(res.body);
    expect(res.body.successful).toBe(true);
    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.id).toEqual(expect.any(String));

    const user = await userRepo.findOne({ where: { email: testEmail } });
    expect(user).not.toBeNull();
    expect(user!.isEmailVerified).toBe(false);
    expect(user!.emailVerificationToken).toEqual(expect.any(String));
    expect(user!.emailVerificationToken!.length).toBeGreaterThan(0);
  });
});
