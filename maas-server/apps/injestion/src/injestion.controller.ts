import { BadRequestException, Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import { InjestionService } from "./injestion.service";
import { IngestSensorDataDto } from "./dto/ingest-sensor-data.dto";
import { Throttle } from "@nestjs/throttler";
import type {Request} from "express"

@Controller("ingest")
export class InjestionController {
  constructor(private readonly injestionService: InjestionService) {}

  @Post()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(202)
  ingest(@Body() dto: IngestSensorDataDto, @Req() req: Request) {
    const x_api_key = req.headers["x-api-key"]
    console.log(x_api_key);
    if(!x_api_key){
      throw new BadRequestException("You are not allowed to access this endpoint")
    }
    return this.injestionService.ingest(dto);
  }
}
