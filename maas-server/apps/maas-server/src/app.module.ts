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
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "@app/shared/guards";
import { TripController } from "./trip.controller";
import { TripService } from "./trip.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

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
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 5,
        },
      ],
    }),
  ],
  controllers: [AppController, TripController, AdminController],
  providers: [
    AppService,
    TripService,
    AdminService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    JwtAuthGuard,
  ],
})
export class AppModule {}
