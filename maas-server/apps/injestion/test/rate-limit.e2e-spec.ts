import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { BullModule } from "@nestjs/bull";
import { InjestionController } from "../src/injestion.controller";
import { InjestionService } from "../src/injestion.service";
import { SENSOR_QUEUE } from "../src/injestion.constants";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { RedisModule, REDIS_CLIENT } from "@app/shared";
import { APP_GUARD } from "@nestjs/core";
import { Redis } from "ioredis";

const TEST_REDIS_URL =
  process.env.REDIS_TEST_URL ?? "redis://localhost:6379/15";

process.env.REDIS_URL = TEST_REDIS_URL;

jest.setTimeout(30000);

const ingestBody = {
  events: [
    {
      trip_id: "trip-id-ratelimit",
      origin: "123 Main St, Springfield",
      destination: "456 Elm St, Springfield",
      transport: "car",
      distance_miles: 8.4,
    },
  ],
};

describe("Injestion Rate Limiting (e2e)", () => {
  let app: INestApplication;
  let redis: Redis;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
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
        BullModule.forRootAsync({
          useFactory: () => {
            if (!TEST_REDIS_URL) {
              throw new Error(`REDIS_URL is required`);
            }

            return {
              redis: TEST_REDIS_URL.startsWith("rediss://")
                ? { url: TEST_REDIS_URL, tls: {} }
                : TEST_REDIS_URL,
              defaultJobOptions: {
                attempts: 3,
                backoff: {
                  type: "exponential",
                  delay: 5000,
                },
                removeOnFail: false,
                timeout: 60000,
              },
            };
          },
        }),
        BullModule.registerQueue({ name: SENSOR_QUEUE }),
      ],
      controllers: [InjestionController],
      providers: [
        InjestionService,
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
    );
    app.useGlobalInterceptors(
      new ErrorResponseInterceptor(),
      new TrimInterceptor(),
    );
    app.setGlobalPrefix("api");

    await app.init();

    redis = app.get(REDIS_CLIENT);
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.flushdb();
    await redis.quit();
    await app.close();
  }, 30000);

  beforeEach(async () => {
    await redis.flushdb();
  });

  it("should enqueue sensor events within the limit", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/ingest")
      .send(ingestBody)
      .expect(202);

    expect(res.body.successful).toBe(true);
  });

  it("should return 429 after exceeding the /ingest limit", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 61; i++) {
      const res = await request(app.getHttpServer())
        .post("/api/ingest")
        .send(ingestBody);
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 60)).toEqual(Array(60).fill(202));
    expect(statuses[60]).toBe(429);
  });
});
