import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { SENSOR_QUEUE } from "./injestion.constants";
import { IngestSensorDataDto } from "./dto/ingest-sensor-data.dto";
import { createResponse } from "@app/shared/utilities/apiResponse";

@Injectable()
export class InjestionService {
  constructor(@InjectQueue(SENSOR_QUEUE) private readonly queue: Queue) {}

  async ingest(dto: IngestSensorDataDto) {
    const jobIds: string[] = [];

    for (const event of dto.events) {
      const job = await this.queue.add("process-sensor-event", event, {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      });
      jobIds.push(String(job.id ?? ""));
    }

    return createResponse(true, "Sensor events queued for processing", {
      queued: jobIds.length,
      jobIds,
    });
  }
}
