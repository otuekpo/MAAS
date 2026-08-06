import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { BullModule, getQueueToken } from "@nestjs/bull";
import type { Queue } from "bull";
import { InjestionController } from "./../src/injestion.controller";
import { InjestionService } from "./../src/injestion.service";
import { SENSOR_QUEUE } from "./../src/injestion.constants";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";

const TEST_REDIS_URL =
  process.env.REDIS_TEST_URL ?? "redis://localhost:6379/15";

describe("InjestionController (e2e)", () => {
  let app: INestApplication;
  let queue: Queue;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
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
                attempts: 3, // Retry failed jobs 3 times
                backoff: {
                  type: "exponential",
                  delay: 5000, // Wait 5s, then 10s, then 20s
                },
                removeOnFail: false, // Keep failed jobs for debugging
                timeout: 60000, // 60 second timeout
              },
            };
          },
        }),
        BullModule.registerQueue({ name: SENSOR_QUEUE }),
      ],
      controllers: [InjestionController],
      providers: [InjestionService],
    }).compile();

    app = moduleFixture.createNestApplication();

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

    queue = app.get<Queue>(getQueueToken(SENSOR_QUEUE));

    await queue.client.flushdb();
    console.log(`[e2e] Flushed test Redis DB at ${TEST_REDIS_URL}`);
  });

  afterEach(async () => {
    await queue.close();
    await app.close();
  });

  it("/api/ingest (POST) — queues events and returns 202", async () => {
    const events = [
      {
        trip_id: "507f1f77bcf86cd799439011",
        origin: "New York",
        destination: "Boston",
        transport: "Train",
        distance_miles: 215,
      },
      {
        trip_id: "507f1f77bcf86cd799439011",
        origin: "New York",
        destination: "Chicago",
        transport: "Plane",
        distance_miles: 790,
      },
    ];

    const res = await request(app.getHttpServer())
      .post("/api/ingest")
      .send({ events })
      .expect(202);

    expect(res.body.successful).toBe(true);
    expect(res.body.data.queued).toBe(2);
    console.log(
      `[e2e] POST /api/ingest -> HTTP ${res.status}, queued=${res.body.data.queued}, jobIds=${JSON.stringify(res.body.data.jobIds)}`,
    );

    const jobCounts = await queue.getJobCounts();
    expect(jobCounts.waiting).toBe(2);
    console.log(
      `[e2e] Redis job counts after ingest -> ${JSON.stringify(jobCounts)}`,
    );

    const jobs = await queue.getJobs(["waiting"]);
    expect(jobs).toHaveLength(events.length);
    const stored = jobs.map((job) => job.data);
    expect(stored).toEqual(
      expect.arrayContaining(
        events.map((event) => expect.objectContaining(event)),
      ),
    );
    for (const job of jobs) {
      console.log(
        `[e2e] Stored in Redis -> job id=${job.id}, name=${job.name}, data=${JSON.stringify(job.data)}`,
      );
    }
  });

  it("/api/ingest (POST) — rejects a missing required field", async () => {
    await request(app.getHttpServer())
      .post("/api/ingest")
      .send({ events: [{ trip_id: "x" }] })
      .expect(400)
      .expect((res) => {
        expect(res.body.successful).toBe(false);
      });

    const jobCounts = await queue.getJobCounts();
    expect(jobCounts.waiting).toBe(0);
    console.log(
      `[e2e] Missing-field rejection -> Redis job counts after reject = ${JSON.stringify(jobCounts)}`,
    );
  });

  it("/api/ingest (POST) — rejects unknown fields", async () => {
    await request(app.getHttpServer())
      .post("/api/ingest")
      .send({ events: [{ bogus: true }] })
      .expect(400)
      .expect((res) => {
        expect(res.body.successful).toBe(false);
      });

    const jobCounts = await queue.getJobCounts();
    expect(jobCounts.waiting).toBe(0);
    console.log(
      `[e2e] Unknown-field rejection -> Redis job counts after reject = ${JSON.stringify(jobCounts)}`,
    );
  });
});
