import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  SensorEvents,
  SensorEventsSchema,
  Trips,
  TripsSchema,
} from "@app/database/mongodb";
import { Payment, User } from "@app/database/pg-entities";
import { InjestionController } from "./injestion.controller";
import { InjestionService } from "./injestion.service";
import { SENSOR_QUEUE } from "./injestion.constants";
import { SensorProcessor } from "./sensor.processor";
import { CostComputationService } from "./services/cost-computation.service";
import { MapNavigationService } from "./services/map-navigation.service";
import { SmartTicketingService } from "./services/smart-ticketing.service";

if (!process.env.MONGODB_URI) {
  throw new Error(`MONGODB_URI is required`);
}
export const REDIS_URL = process.env.REDIS_URL;
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => {
        if (!REDIS_URL) {
          throw new Error(`REDIS_URL is required`);
        }

        return {
          redis: REDIS_URL.startsWith("rediss://")
            ? { url: REDIS_URL, tls: {} }
            : REDIS_URL,
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
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL,
      entities: [User, Payment],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Payment]),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    MongooseModule.forFeature([
      { name: Trips.name, schema: TripsSchema },
      { name: SensorEvents.name, schema: SensorEventsSchema },
    ]),
  ],
  controllers: [InjestionController],
  providers: [
    InjestionService,
    SensorProcessor,
    CostComputationService,
    MapNavigationService,
    SmartTicketingService,
  ],
})
export class InjestionModule {}
