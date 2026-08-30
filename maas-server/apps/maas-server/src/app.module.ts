import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MongooseModule } from "@nestjs/mongoose";
import {
  Logs,
  LogsSchema,
  SensorEvents,
  SensorEventsSchema,
  Trips,
  TripsSchema,
} from "@app/database/mongodb";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Payment, User } from "@app/database/pg-entities";
import { JwtModule } from "@nestjs/jwt";
import { EmailModule } from "@app/email";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { RedisModule, REDIS_CLIENT } from "@app/shared";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import Redis from "ioredis";
import { BullModule } from "@nestjs/bull";
import { JwtAuthGuard } from "@app/shared/guards";
import { TripController } from "./trip.controller";
import { TripService } from "./trip.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { BruteForceService } from "./brute-force.service";
import { AuditLogInterceptor } from "./audit-log.interceptor";
import { AUDIT_LOG_QUEUE } from "./audit-log.constants";

if (!process.env.MONGODB_URI) {
  throw new Error(`MONGODB_URI is required`);
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL,
      entities: [User, Payment],
      synchronize: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    TypeOrmModule.forFeature([User, Payment]),
    MongooseModule.forFeature([
      {
        name: Trips.name,
        schema: TripsSchema,
      },
      {
        name: SensorEvents.name,
        schema: SensorEventsSchema,
      },
      {
        name: Logs.name,
        schema: LogsSchema,
      },
    ]),
    JwtModule,
    EmailModule,
    RedisModule,
    BullModule.forRootAsync({
      useFactory: () => {
        const url = process.env.REDIS_URL;
        if (!url) {
          throw new Error(`REDIS_URL is required`);
        }

        return {
          redis: url.startsWith("rediss://") ? { url, tls: {} } : url,
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
    BullModule.registerQueue({ name: AUDIT_LOG_QUEUE }),
    ThrottlerModule.forRootAsync({
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        throttlers: [
          {
            name: "default",
            ttl: 60000,
            limit: 100,
            blockDuration: 60000,
          },
        ],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
  ],
  controllers: [AppController, TripController, AdminController],
  providers: [
    AppService,
    TripService,
    AdminService,
    BruteForceService,
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    JwtAuthGuard,
  ],
})
export class AppModule {}
