import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { JwtAuthGuard } from "@app/shared/guards/jwt.guard";
import { TripService } from "./trip.service";
import { CreateTripDto } from "./dto/createTrip";
import { UpdateTripDto } from "./dto/updateTrip";

@Controller("trips")
@UseGuards(JwtAuthGuard)
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateTripDto) {
    return this.tripService.createTrip(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.tripService.getTrips(req.user.id);
  }

  @Get(":id")
  findOne(@Req() req: any, @Param("id") id: string) {
    return this.tripService.getTripById(req.user.id, id);
  }

  @Patch(":id")
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateTripDto) {
    return this.tripService.updateTrip(req.user.id, id, dto);
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.tripService.deleteTrip(req.user.id, id);
  }
}
