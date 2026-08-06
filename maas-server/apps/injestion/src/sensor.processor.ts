import { Processor, Process } from "@nestjs/bull";
import type { Job } from "bull";
import { Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SensorEvents, Trips } from "@app/database/mongodb";
import { SENSOR_QUEUE } from "./injestion.constants";
import { TRANSPORT_METRICS, formatEta } from "@app/shared/constants/transport";
import { CostComputationService } from "./services/cost-computation.service";
import { MapNavigationService } from "./services/map-navigation.service";
import { SmartTicketingService } from "./services/smart-ticketing.service";

export interface SensorEventPayload {
  trip_id: string;
  origin: string;
  destination: string;
  transport: string;
  distance_miles: number;
  lat?: number;
  lng?: number;
  timestamp?: string;
}

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

@Processor(SENSOR_QUEUE)
export class SensorProcessor {
  private readonly logger = new Logger(SensorProcessor.name);

  constructor(
    @InjectModel(Trips.name) private readonly tripsModel: Model<Trips>,
    @InjectModel(SensorEvents.name)
    private readonly sensorEventsModel: Model<SensorEvents>,
    private readonly costComputationService: CostComputationService,
    private readonly mapNavigationService: MapNavigationService,
    private readonly smartTicketingService: SmartTicketingService,
  ) {}

  @Process({
    name: "process-sensor-event",
    concurrency: Number(process.env.SENSOR_PROCESSOR_CONCURRENCY ?? 1),
  })
  async processSensorEvent(job: Job<SensorEventPayload>) {
    const startTime = Date.now();
    this.logger.log(`Starting sensor event job ${job.id}`);

    try {
      const {
        trip_id,
        origin,
        destination,
        transport,
        distance_miles,
        lat,
        lng,
        timestamp,
      } = job.data;

      const metric = TRANSPORT_METRICS[transport];
      if (!metric) {
        this.logger.warn(
          `Unknown transport "${transport}" for trip ${trip_id}. Skipping.`,
        );
        return;
      }

      // 1) The one real derived value — Time of Arrival Estimation (distance / average speed)
      const etaHours = distance_miles / metric.averageSpeedMph;
      const eta = formatEta(etaHours);

      // 2) Persist the raw sensor event (location side — MongoDB)
      await this.sensorEventsModel.create({
        trip_id,
        location: { lat: lat ?? 0, lng: lng ?? 0 },
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      });

      // 3) Mocked services
      const cost = this.costComputationService.compute(
        distance_miles,
        transport,
      );
      const route = this.mapNavigationService.route(
        origin,
        destination,
        distance_miles,
      );

      let userId: string | null = null;
      if (OBJECT_ID_PATTERN.test(trip_id)) {
        const trip = await this.tripsModel.findById(trip_id);
        if (trip) {
          userId = trip.user_id;
          await this.tripsModel.updateOne({ _id: trip_id }, { $set: { eta } });
        } else {
          this.logger.warn(`Trip ${trip_id} not found. Skipping eta update.`);
        }
      }

      // 4) Smart Ticketing — writes a payment record to PostgreSQL,
      //    proving the location/payment split (location in Mongo, payment in PG)
      if (userId) {
        await this.smartTicketingService.issueTicket(trip_id, userId, cost);
      }

      this.logger.log(
        `Processed trip ${trip_id}: ${origin} -> ${destination} via ${transport}, ` +
          `${distance_miles} mi, eta=${eta}, cost=$${cost.toFixed(2)}, waypoints=${route.waypoints.length}`,
      );

      return { trip_id, eta, cost };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Sensor event job ${job.id} failed after ${duration}ms: ${error?.message}`,
      );

      if (error instanceof TypeError) {
        this.logger.error(
          `Network error — cause: ${JSON.stringify(error?.cause)}`,
        );
      }

      this.logger.error(
        `Job ${job.id} details — trip: ${job.data.trip_id}, transport: ${job.data.transport}, stack: ${error.stack}`,
      );
      throw error;
    }
  }
}
