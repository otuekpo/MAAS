import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { InjestionService } from "./injestion.service";
import { IngestSensorDataDto } from "./dto/ingest-sensor-data.dto";

@Controller("ingest")
export class InjestionController {
  constructor(private readonly injestionService: InjestionService) {}

  @Post()
  @HttpCode(202)
  ingest(@Body() dto: IngestSensorDataDto) {
    return this.injestionService.ingest(dto);
  }
}
