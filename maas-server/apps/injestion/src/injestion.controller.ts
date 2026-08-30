import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { InjestionService } from "./injestion.service";
import { IngestSensorDataDto } from "./dto/ingest-sensor-data.dto";
import { Throttle } from "@nestjs/throttler";

@Controller("ingest")
export class InjestionController {
  constructor(private readonly injestionService: InjestionService) {}

  @Post()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(202)
  ingest(@Body() dto: IngestSensorDataDto) {
    return this.injestionService.ingest(dto);
  }
}
