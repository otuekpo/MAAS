import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { BullModule, getQueueToken } from "@nestjs/bull";
import type { Queue } from "bull";
import { InjestionController } from "../src/injestion.controller";
import { InjestionService } from "../src/injestion.service";
import { SENSOR_QUEUE } from "../src/injestion.constants";
import {
    ErrorResponseInterceptor,
    TrimInterceptor,
} from "@app/shared/interceptors";
import { Redis } from "ioredis";

const TEST_REDIS_URL =
    process.env.REDIS_TEST_URL ?? "redis://localhost:6379/15";

jest.setTimeout(20000)

interface TestInterface {
    trip_id: string;
    cost: number
}

describe("Queue (e2e)", () => {
    let app: INestApplication;
    let queue: Queue<TestInterface>;

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

    it("redis connectivity", async () => {
        const pong = await queue.client.ping();
        expect(pong).toEqual("PONG");
    });

    it("Queue is active", async () => {
        const data: TestInterface = { cost: 200, trip_id: "trip-id-20000" };
        const job = await queue.add(data);
        expect(job.data).toEqual(data);

        const isReady = await queue.isReady();
        expect(isReady).toBeTruthy();

        const counts = await queue.getJobCounts();
        expect(counts.waiting + counts.active).toBeGreaterThanOrEqual(1);
    });


    it("enqueues a job for the DTO body", async () => {
        const dto = {
            "events": [
                {
                    "trip_id": "trip-id-20000",
                    "origin": "123 Main St, Springfield",
                    "destination": "456 Elm St, Springfield",
                    "transport": "car",
                    "distance_miles": 8.4,
                    "lat": 39.7817,
                    "lng": -89.6501,
                    "timestamp": "2026-08-05T09:15:00.000Z"
                },
                {
                    "trip_id": "trip-id-20000",
                    "origin": "456 Elm St, Springfield",
                    "destination": "789 Oak Ave, Springfield",
                    "transport": "walking",
                    "distance_miles": 0.6
                }
            ]
        };
        const res = await request(app.getHttpServer())
            .post("/api/ingest") 
            .send(dto)
            .expect(202);
        
        console.log(res.body)

        const counts = await queue.getJobCounts();
        expect(counts.waiting).toBeGreaterThanOrEqual(1);
    });

});
