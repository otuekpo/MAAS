import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { MongooseModule, getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BullModule, getQueueToken } from "@nestjs/bull";
import type { Queue } from "bull";
import { Payment, User } from "@app/database/pg-entities";
import {
  SensorEvents,
  SensorEventsSchema,
  Trips,
  TripsSchema,
} from "@app/database/mongodb";
import { InjestionController } from "./../src/injestion.controller";
import { InjestionService } from "./../src/injestion.service";
import { SensorProcessor } from "./../src/sensor.processor";
import { SENSOR_QUEUE } from "./../src/injestion.constants";
import { CostComputationService } from "./../src/services/cost-computation.service";
import { MapNavigationService } from "./../src/services/map-navigation.service";
import { SmartTicketingService } from "./../src/services/smart-ticketing.service";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";

const TEST_DB_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/maas_test";
const TEST_REDIS_URL =
  process.env.REDIS_TEST_URL ?? "redis://localhost:6379/14";
const TEST_MONGO_URI =
  process.env.MONGODB_TEST_URI ?? "mongodb://localhost:27017/maas_test_e2e";

const TEST_USER_ID = "507f1f77-bcf8-6cd7-9943-901100000001";
const TEST_USER_EMAIL = "sensor_processor_e2e@maas.test";

jest.setTimeout(30000);

describe("SensorProcessor (e2e)", () => {
  let app: INestApplication;
  let queue: Queue;
  let sensorEventsModel: Model<SensorEvents>;
  let tripsModel: Model<Trips>;
  let paymentRepo: Repository<Payment>;
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
        TypeOrmModule.forFeature([Payment, User]),
        MongooseModule.forRoot(TEST_MONGO_URI),
        MongooseModule.forFeature([
          { name: Trips.name, schema: TripsSchema },
          { name: SensorEvents.name, schema: SensorEventsSchema },
        ]),
        BullModule.forRoot({ redis: TEST_REDIS_URL }),
        BullModule.registerQueue({ name: SENSOR_QUEUE }),
      ],
      controllers: [InjestionController],
      providers: [
        InjestionService,
        SensorProcessor,
        CostComputationService,
        MapNavigationService,
        SmartTicketingService,
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

    queue = app.get<Queue>(getQueueToken(SENSOR_QUEUE));
    sensorEventsModel = app.get<Model<SensorEvents>>(
      getModelToken(SensorEvents.name),
    );
    tripsModel = app.get<Model<Trips>>(getModelToken(Trips.name));
    paymentRepo = app.get<Repository<Payment>>(getRepositoryToken(Payment));
    userRepo = app.get<Repository<User>>(getRepositoryToken(User));

    await paymentRepo.query('DELETE FROM "payment"');
    await userRepo.query('DELETE FROM "user"');
    await userRepo.save(
      userRepo.create({
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        password: "test-hash",
      }),
    );

    console.log(
      `[e2e] Connected — PG ${TEST_DB_URL}, Redis ${TEST_REDIS_URL}, Mongo ${TEST_MONGO_URI}`,
    );
  });

  beforeEach(async () => {
    await queue.client.flushdb();
    await sensorEventsModel.deleteMany({});
    await tripsModel.deleteMany({});
    await paymentRepo.query('DELETE FROM "payment"');
  });

  afterAll(async () => {
    await sensorEventsModel.deleteMany({});
    await tripsModel.deleteMany({});
    await paymentRepo.query('DELETE FROM "payment"');
    await userRepo.query('DELETE FROM "user"');
    await queue.close();
    await app.close();
  });

  async function waitFor(
    predicate: () => Promise<boolean>,
    message: string,
  ): Promise<void> {
    for (let i = 0; i < 100; i++) {
      if (await predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out waiting for ${message}`);
  }

  async function createTrip(
    route = "New York -> Boston",
    transport = "Train",
    cost = 53.75,
  ) {
    return tripsModel.create({
      user_id: TEST_USER_ID,
      route,
      transport,
      date: new Date(),
      cost,
    });
  }

  it("POST /api/ingest — processor persists sensor events in MongoDB", async () => {
    const events = [
      {
        trip_id: "507f1f77bcf86cd799439011",
        origin: "New York",
        destination: "Boston",
        transport: "Train",
        distance_miles: 215,
        lat: 40.7128,
        lng: -74.006,
        timestamp: "2026-08-05T10:00:00.000Z",
      },
      {
        trip_id: "507f1f77bcf86cd799439011",
        origin: "New York",
        destination: "Chicago",
        transport: "Plane",
        distance_miles: 790,
        lat: 41.8781,
        lng: -87.6298,
        timestamp: "2026-08-05T10:05:00.000Z",
      },
    ];

    const res = await request(app.getHttpServer())
      .post("/api/ingest")
      .send({ events })
      .expect(202);

    expect(res.body.successful).toBe(true);
    expect(res.body.data.queued).toBe(2);
    console.log(
      `[e2e] POST /api/ingest -> HTTP ${res.status}, queued=${res.body.data.queued}`,
    );

    await waitFor(
      async () => (await sensorEventsModel.countDocuments()) >= events.length,
      "sensor events to be persisted in MongoDB",
    );

    const jobCounts = await queue.getJobCounts();
    console.log(
      `[e2e] Redis job counts after processing -> ${JSON.stringify(jobCounts)}`,
    );

    const stored = await sensorEventsModel.find().lean();
    console.log(
      `[e2e] SensorEvents documents in MongoDB -> ${JSON.stringify(stored)}`,
    );

    expect(stored).toHaveLength(events.length);

    const expected = events.map((event) =>
      expect.objectContaining({
        trip_id: event.trip_id,
        location: { lat: event.lat, lng: event.lng },
        timestamp: new Date(event.timestamp!),
      }),
    );
    expect(
      stored.map((doc) => ({
        trip_id: doc.trip_id,
        location: doc.location,
        timestamp: doc.timestamp,
      })),
    ).toEqual(expect.arrayContaining(expected));
  });

  it("updates the trip eta in MongoDB when the trip exists", async () => {
    const trip = await createTrip();
    const tripId = trip._id.toString();

    const res = await request(app.getHttpServer())
      .post("/api/ingest")
      .send({
        events: [
          {
            trip_id: tripId,
            origin: "New York",
            destination: "Boston",
            transport: "Train",
            distance_miles: 215,
            lat: 40.7128,
            lng: -74.006,
            timestamp: "2026-08-05T10:00:00.000Z",
          },
        ],
      })
      .expect(202);

    console.log(
      `[e2e] POST /api/ingest for trip ${tripId} -> HTTP ${res.status}`,
    );

    await waitFor(
      async () => (await tripsModel.findById(tripId))?.eta === "2h 9m",
      "trip eta to be updated in MongoDB",
    );

    const updatedTrip = await tripsModel.findById(tripId).lean();
    console.log(
      `[e2e] Trip ${tripId} after processing -> ${JSON.stringify(updatedTrip)}`,
    );

    expect(updatedTrip?.eta).toBe("2h 9m");
  });

  it("writes location to MongoDB and payment to PostgreSQL when the trip exists", async () => {
    const trip = await createTrip();
    const tripId = trip._id.toString();

    const res = await request(app.getHttpServer())
      .post("/api/ingest")
      .send({
        events: [
          {
            trip_id: tripId,
            origin: "New York",
            destination: "Boston",
            transport: "Train",
            distance_miles: 215,
            lat: 40.7128,
            lng: -74.006,
            timestamp: "2026-08-05T10:00:00.000Z",
          },
        ],
      })
      .expect(202);

    console.log(
      `[e2e] POST /api/ingest for trip ${tripId} -> HTTP ${res.status}`,
    );

    await waitFor(
      async () =>
        (await paymentRepo.find({ where: { trip_id: tripId } })).length >= 1,
      "payment to be written to PostgreSQL",
    );

    const sensorDocs = await sensorEventsModel.find({ trip_id: tripId }).lean();
    console.log(
      `[e2e] SensorEvents (location) in MongoDB -> ${JSON.stringify(sensorDocs)}`,
    );

    const payments = await paymentRepo.find({
      where: { trip_id: tripId },
      relations: { user: true },
    });
    console.log(
      `[e2e] Payment (billing) in PostgreSQL -> ${JSON.stringify(payments)}`,
    );

    expect(sensorDocs).toHaveLength(1);
    expect(sensorDocs[0].location).toEqual({ lat: 40.7128, lng: -74.006 });

    expect(payments).toHaveLength(1);
    expect(Number(payments[0].amount)).toBe(53.75);
    expect(payments[0].trip_id).toBe(tripId);
    expect(payments[0].user.id).toBe(TEST_USER_ID);
  });
});
