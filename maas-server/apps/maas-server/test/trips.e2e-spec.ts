import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Model } from "mongoose";
import { User, Payment } from "@app/database/pg-entities";
import { Trips, TripsSchema } from "@app/database/mongodb";
import { hash } from "bcrypt";
import { TripService } from "./../src/trip.service";
import { TripController } from "./../src/trip.controller";
import { LowercaseEmailPipe } from "@app/shared/pipes";
import {
  ErrorResponseInterceptor,
  TrimInterceptor,
} from "@app/shared/interceptors";
import { JwtAuthGuard } from "@app/shared/guards/jwt.guard";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

const TEST_DB_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/maas_test";

const MONGO_URL =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/maas_test?directConnection=true";

process.env.SECRET_KEY = "test-secret-key";

jest.setTimeout(30000);

describe("Trip Endpoints (e2e)", () => {
  let app: INestApplication<App>;
  let userRepo: Repository<User>;
  let jwtService: JwtService;
  let tripsModel: Model<Trips>;

  const testPassword = "Str0ng!Pass#1";

  // ─── Helpers ───────────────────────────────────────────

  function generateToken(user: {
    id: string;
    email: string;
    role: number;
  }): string {
    return jwtService.sign(
      { id: user.id, email: user.email, role: user.role },
      { secret: process.env.SECRET_KEY },
    );
  }

  async function createTestUser(
    email: string,
    verified = true,
  ): Promise<{ user: User; token: string }> {
    const hashed = await hash(testPassword, 10);
    const user = userRepo.create({
      email,
      password: hashed,
      isEmailVerified: verified,
      role: 0,
    });
    const saved = await userRepo.save(user);
    const token = generateToken({
      id: saved.id,
      email: saved.email,
      role: saved.role,
    });
    return { user: saved, token };
  }

  async function createTrip(
    token: string,
    overrides: Record<string, unknown> = {},
  ): Promise<any> {
    const body = {
      route: "Lagos - Abuja",
      transport: "bus",
      date: "2026-09-15T08:00:00.000Z",
      cost: 15000,
      ...overrides,
    };
    const res = await request(app.getHttpServer())
      .post("/api/trips")
      .set("Authorization", `Bearer ${token}`)
      .send(body);
    return res;
  }

  // ─── Setup ─────────────────────────────────────────────

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
        MongooseModule.forRoot(MONGO_URL),
        MongooseModule.forFeature([{ name: Trips.name, schema: TripsSchema }]),
        JwtModule.register({
          secret: process.env.SECRET_KEY,
        }),
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 100 }],
        }),
      ],
      controllers: [TripController],
      providers: [
        TripService,
        JwtAuthGuard,
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
    jwtService = app.get(JwtService);
    tripsModel = app.get<Model<Trips>>(`TripsModel`);

    await userRepo.query('DELETE FROM "user"');
    await tripsModel.deleteMany({});
  });

  afterAll(async () => {
    await tripsModel.deleteMany({});
    await userRepo.query('DELETE FROM "user"');
    await userRepo.query('DELETE FROM "payment"');
    await app.close();
  }, 30000);

  // ─── Auth (4 tests) ────────────────────────────────────

  describe("Authentication", () => {
    it("should return 401 when no token is provided", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/trips")
        .expect(401);

      expect(res.body).toEqual({
        successful: false,
        message: "Missing or invalid Authorization header",
        data: null,
      });
    });

    it("should return 401 when token is malformed", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/trips")
        .set("Authorization", "Bearer garbage-token-value")
        .expect(401);

      expect(res.body).toEqual({
        successful: false,
        message: "Invalid token",
        data: null,
      });
    });

    it("should return 401 when token is expired", async () => {
      const expiredToken = jwtService.sign(
        { id: "fake-id", email: "fake@test.com", role: 0 },
        {
          secret: process.env.SECRET_KEY,
          expiresIn: "0s",
        },
      );

      const res = await request(app.getHttpServer())
        .get("/api/trips")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body).toEqual({
        successful: false,
        message: "Token has expired",
        data: null,
      });
    });

    it("should return 401 when token has wrong signature", async () => {
      const wrongSecretToken = jwtService.sign(
        { id: "fake-id", email: "fake@test.com", role: 0 },
        { secret: "wrong-secret-key" },
      );

      const res = await request(app.getHttpServer())
        .get("/api/trips")
        .set("Authorization", `Bearer ${wrongSecretToken}`)
        .expect(401);

      expect(res.body).toEqual({
        successful: false,
        message: "Invalid token",
        data: null,
      });
    });
  });

  // ─── POST /api/trips — Create (12 tests) ───────────────

  describe("POST /api/trips", () => {
    let userToken: string;

    beforeAll(async () => {
      const { token } = await createTestUser(
        `creator_${Date.now()}@example.com`,
      );
      userToken = token;
    });

    it("should create a trip with valid required fields", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          route: "Lagos - Abuja",
          transport: "bus",
          date: "2026-09-15T08:00:00.000Z",
          cost: 15000,
        })
        .expect(201);

      expect(res.body).toEqual({
        successful: true,
        message: "Trip created successfully",
        data: expect.objectContaining({
          _id: expect.any(String),
          user_id: expect.any(String),
          route: "Lagos - Abuja",
          transport: "bus",
          date: expect.any(String),
          cost: 15000,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      });
    });

    it("should create a trip with optional description and eta", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          route: "Port Harcourt - Enugu",
          transport: "train",
          date: "2026-10-01T10:00:00.000Z",
          cost: 8000,
          description: "Business trip",
          eta: "4h 30m",
        })
        .expect(201);

      expect(res.body).toEqual({
        successful: true,
        message: "Trip created successfully",
        data: expect.objectContaining({
          route: "Port Harcourt - Enugu",
          transport: "train",
          cost: 8000,
          description: "Business trip",
          eta: "4h 30m",
        }),
      });
    });

    it("should reject body user_id as extra field (forbidNonWhitelisted)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          user_id: "spoofed-user-id",
          route: "Ibadan - Oyo",
          transport: "car",
          date: "2026-11-01T09:00:00.000Z",
          cost: 5000,
        })
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });

    it("should return 400 when body is empty", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });

    it("should return 400 when route is missing", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          transport: "bus",
          date: "2026-09-15T08:00:00.000Z",
          cost: 15000,
        })
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });

    it("should return 400 when transport is missing", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          route: "Lagos - Abuja",
          date: "2026-09-15T08:00:00.000Z",
          cost: 15000,
        })
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });

    it("should return 400 when date is missing", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          route: "Lagos - Abuja",
          transport: "bus",
          cost: 15000,
        })
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });

    it("should return 400 when cost is missing", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          route: "Lagos - Abuja",
          transport: "bus",
          date: "2026-09-15T08:00:00.000Z",
        })
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });

    it("should return 400 when date is not a valid ISO string", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          route: "Lagos - Abuja",
          transport: "bus",
          date: "not-a-date",
          cost: 15000,
        })
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });

    it("should return 400 when cost is not a number", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          route: "Lagos - Abuja",
          transport: "bus",
          date: "2026-09-15T08:00:00.000Z",
          cost: "abc",
        })
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });

    it("should return 400 when extra unknown fields are provided", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          route: "Lagos - Abuja",
          transport: "bus",
          date: "2026-09-15T08:00:00.000Z",
          cost: 15000,
          hacker: true,
        })
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });

    it("should return 400 when route is an empty string", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          route: "",
          transport: "bus",
          date: "2026-09-15T08:00:00.000Z",
          cost: 15000,
        })
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });
  });

  // ─── GET /api/trips — List (3 tests) ───────────────────

  describe("GET /api/trips", () => {
    let user1Token: string;
    let user2Token: string;

    beforeAll(async () => {
      await tripsModel.deleteMany({});
      const u1 = await createTestUser(`list1_${Date.now()}@example.com`);
      const u2 = await createTestUser(`list2_${Date.now()}@example.com`);
      user1Token = u1.token;
      user2Token = u2.token;

      await createTrip(user1Token, { route: "User1 Trip A" });
      await createTrip(user1Token, { route: "User1 Trip B" });
      await createTrip(user2Token, { route: "User2 Trip A" });
    });

    it("should return only the authenticated user's trips", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/trips")
        .set("Authorization", `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body).toEqual({
        successful: true,
        message: "Trips fetched successfully",
        data: expect.arrayContaining([
          expect.objectContaining({ route: "User1 Trip A" }),
          expect.objectContaining({ route: "User1 Trip B" }),
        ]),
      });
      expect(res.body.data).toHaveLength(2);
      res.body.data.forEach((trip: any) => {
        expect(trip.route).not.toBe("User2 Trip A");
      });
    });

    it("should return empty array when user has no trips", async () => {
      const fresh = await createTestUser(`empty_${Date.now()}@example.com`);
      const res = await request(app.getHttpServer())
        .get("/api/trips")
        .set("Authorization", `Bearer ${fresh.token}`)
        .expect(200);

      expect(res.body).toEqual({
        successful: true,
        message: "Trips fetched successfully",
        data: [],
      });
    });

    it("should return trips with correct structure", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/trips")
        .set("Authorization", `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      const trip = res.body.data[0];
      expect(trip).toEqual(
        expect.objectContaining({
          _id: expect.any(String),
          user_id: expect.any(String),
          route: expect.any(String),
          transport: expect.any(String),
          date: expect.any(String),
          cost: expect.any(Number),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
    });
  });

  // ─── GET /api/trips/:id — Read one (4 tests) ───────────

  describe("GET /api/trips/:id", () => {
    let user1Token: string;
    let user2Token: string;
    let user1TripId: string;
    let user2TripId: string;

    beforeAll(async () => {
      await tripsModel.deleteMany({});
      const u1 = await createTestUser(`read1_${Date.now()}@example.com`);
      const u2 = await createTestUser(`read2_${Date.now()}@example.com`);
      user1Token = u1.token;
      user2Token = u2.token;

      const trip1 = await createTrip(user1Token, { route: "Read Trip 1" });
      user1TripId = trip1.body.data._id;

      const trip2 = await createTrip(user2Token, { route: "Read Trip 2" });
      user2TripId = trip2.body.data._id;
    });

    it("should return a trip by ID when it belongs to the user", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/trips/${user1TripId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body).toEqual({
        successful: true,
        message: "Trip fetched successfully",
        data: expect.objectContaining({
          _id: user1TripId,
          route: "Read Trip 1",
        }),
      });
    });

    it("should return 404 when trip does not exist", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const res = await request(app.getHttpServer())
        .get(`/api/trips/${fakeId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .expect(404);

      expect(res.body).toEqual({
        successful: false,
        message: "Trip not found",
        data: null,
      });
    });

    it("should return 403 when trip belongs to another user", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/trips/${user2TripId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .expect(403);

      expect(res.body).toEqual({
        successful: false,
        message: "You do not have access to this trip",
        data: null,
      });
    });

    it("should return 400 for invalid ObjectId format", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/trips/not-an-id")
        .set("Authorization", `Bearer ${user1Token}`)
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });
  });

  // ─── PATCH /api/trips/:id — Update (5 tests) ──────────

  describe("PATCH /api/trips/:id", () => {
    let user1Token: string;
    let user2Token: string;
    let user1TripId: string;
    let user2TripId: string;

    beforeAll(async () => {
      await tripsModel.deleteMany({});
      const u1 = await createTestUser(`upd1_${Date.now()}@example.com`);
      const u2 = await createTestUser(`upd2_${Date.now()}@example.com`);
      user1Token = u1.token;
      user2Token = u2.token;

      const trip1 = await createTrip(user1Token, {
        route: "Update Trip 1",
        cost: 10000,
      });
      user1TripId = trip1.body.data._id;

      const trip2 = await createTrip(user2Token, { route: "Update Trip 2" });
      user2TripId = trip2.body.data._id;
    });

    it("should update a trip with valid partial data", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/trips/${user1TripId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ cost: 20000 })
        .expect(200);

      expect(res.body).toEqual({
        successful: true,
        message: "Trip updated successfully",
        data: expect.objectContaining({
          _id: user1TripId,
          route: "Update Trip 1",
          cost: 20000,
        }),
      });
    });

    it("should return 404 when trip does not exist", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const res = await request(app.getHttpServer())
        .patch(`/api/trips/${fakeId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ cost: 99999 })
        .expect(404);

      expect(res.body).toEqual({
        successful: false,
        message: "Trip not found",
        data: null,
      });
    });

    it("should return 403 when trip belongs to another user", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/trips/${user2TripId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ cost: 99999 })
        .expect(403);

      expect(res.body).toEqual({
        successful: false,
        message: "You do not have access to this trip",
        data: null,
      });
    });

    it("should return 400 when update contains invalid fields", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/trips/${user1TripId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ fakeField: "bad" })
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });

    it("should return 400 for invalid ObjectId format", async () => {
      const res = await request(app.getHttpServer())
        .patch("/api/trips/not-an-id")
        .set("Authorization", `Bearer ${user1Token}`)
        .send({ cost: 5000 })
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });
  });

  // ─── DELETE /api/trips/:id — Delete (5 tests) ─────────

  describe("DELETE /api/trips/:id", () => {
    let user1Token: string;
    let user2Token: string;
    let user2TripId: string;

    beforeAll(async () => {
      await tripsModel.deleteMany({});
      const u1 = await createTestUser(`del1_${Date.now()}@example.com`);
      const u2 = await createTestUser(`del2_${Date.now()}@example.com`);
      user1Token = u1.token;
      user2Token = u2.token;

      const trip = await createTrip(user2Token, { route: "Delete Trip 2" });
      user2TripId = trip.body.data._id;
    });

    it("should delete a trip and confirm it is gone from DB", async () => {
      const created = await createTrip(user1Token, { route: "To Delete" });
      const tripId = created.body.data._id;

      const res = await request(app.getHttpServer())
        .delete(`/api/trips/${tripId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body).toEqual({
        successful: true,
        message: "Trip deleted successfully",
        data: null,
      });

      const getRes = await request(app.getHttpServer())
        .get(`/api/trips/${tripId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .expect(404);

      expect(getRes.body.data).toBeNull();
    });

    it("should return 404 when trip does not exist", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const res = await request(app.getHttpServer())
        .delete(`/api/trips/${fakeId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .expect(404);

      expect(res.body).toEqual({
        successful: false,
        message: "Trip not found",
        data: null,
      });
    });

    it("should return 403 when trip belongs to another user", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/trips/${user2TripId}`)
        .set("Authorization", `Bearer ${user1Token}`)
        .expect(403);

      expect(res.body).toEqual({
        successful: false,
        message: "You do not have access to this trip",
        data: null,
      });
    });

    it("should return 400 for invalid ObjectId format", async () => {
      const res = await request(app.getHttpServer())
        .delete("/api/trips/not-an-id")
        .set("Authorization", `Bearer ${user1Token}`)
        .expect(400);

      expect(res.body).toEqual({
        successful: false,
        message: expect.any(String),
        data: null,
      });
    });

    it("should not affect other users trips when deleting", async () => {
      const remaining = await request(app.getHttpServer())
        .get("/api/trips")
        .set("Authorization", `Bearer ${user2Token}`)
        .expect(200);

      expect(remaining.body.data).toHaveLength(1);
      expect(remaining.body.data[0]._id).toBe(user2TripId);
    });
  });

  // ─── Security (pen-tester) (2 tests) ──────────────────

  describe("Security", () => {
    let secToken: string;

    beforeAll(async () => {
      const { token } = await createTestUser(`sec_${Date.now()}@example.com`);
      secToken = token;
    });

    // it("should safely ignore __proto__ injection in body", async () => {
    //   const res = await request(app.getHttpServer())
    //     .post("/api/trips")
    //     .set("Authorization", `Bearer ${secToken}`)
    //     .send({
    //       route: "Safe Route",
    //       transport: "bus",
    //       date: "2026-01-01T00:00:00.000Z",
    //       cost: 100,
    //       __proto__: { polluted: true },
    //     })
    //     .expect(201);

    //   expect(res.body.successful).toBe(true);
    //   expect(res.body.data.__proto__).toBeUndefined();
    //   expect(res.body.data.route).toBe("Safe Route");
    // });

    it("should store and return XSS in route field as-is", async () => {
      const xssPayload = "<script>alert(1)</script>";
      const res = await request(app.getHttpServer())
        .post("/api/trips")
        .set("Authorization", `Bearer ${secToken}`)
        .send({
          route: xssPayload,
          transport: "bus",
          date: "2026-01-01T00:00:00.000Z",
          cost: 100,
        })
        .expect(201);

      expect(res.body.data.route).toBe(xssPayload);
    });
  });
});
