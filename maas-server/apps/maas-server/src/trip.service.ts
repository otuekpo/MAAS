import { Trips } from "@app/database/mongodb";
import {
  BadRequestException,
  ForbiddenException,
  // HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateTripDto } from "./dto/createTrip";
import { UpdateTripDto } from "./dto/updateTrip";
import { createResponse } from "@app/shared/utilities/apiResponse";

@Injectable()
export class TripService {
  constructor(@InjectModel(Trips.name) private tripsModel: Model<Trips>) {}

  async createTrip(userId: string, dto: CreateTripDto) {
    const trip = await this.tripsModel.create({
      user_id: userId,
      route: dto.route,
      transport: dto.transport,
      date: dto.date,
      cost: dto.cost,
      description: dto.description ?? undefined,
      eta: dto.eta ?? undefined,
    });

    return createResponse(true, "Trip created successfully", trip);
  }

  async getTrips(userId: string) {
    const trips = await this.tripsModel
      .find({ user_id: userId })
      .sort({ createdAt: -1 });

    return createResponse(true, "Trips fetched successfully", trips);
  }

  async getTripById(userId: string, tripId: string) {
    const trip = this.assertValidObjectId(tripId);

    const found = await this.tripsModel.findById(trip);
    if (!found) {
      throw new NotFoundException(
        createResponse(false, "Trip not found", null),
      );
    }

    if (found.user_id !== userId) {
      throw new ForbiddenException(
        createResponse(false, "You do not have access to this trip", null),
      );
    }

    return createResponse(true, "Trip fetched successfully", found);
  }

  async updateTrip(userId: string, tripId: string, dto: UpdateTripDto) {
    const trip = this.assertValidObjectId(tripId);

    const found = await this.tripsModel.findById(trip);
    if (!found) {
      throw new NotFoundException(
        createResponse(false, "Trip not found", null),
      );
    }

    if (found.user_id !== userId) {
      throw new ForbiddenException(
        createResponse(false, "You do not have access to this trip", null),
      );
    }

    const updated = await this.tripsModel.findByIdAndUpdate(trip, dto, {
      new: true,
      runValidators: true,
    });

    return createResponse(true, "Trip updated successfully", updated);
  }

  async deleteTrip(userId: string, tripId: string) {
    const trip = this.assertValidObjectId(tripId);

    const found = await this.tripsModel.findById(trip);
    if (!found) {
      throw new NotFoundException(
        createResponse(false, "Trip not found", null),
      );
    }

    if (found.user_id !== userId) {
      throw new ForbiddenException(
        createResponse(false, "You do not have access to this trip", null),
      );
    }

    await this.tripsModel.findByIdAndDelete(trip);

    return createResponse(true, "Trip deleted successfully", null);
  }

  private assertValidObjectId(id: string) {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException(
        createResponse(false, "Invalid trip ID format", null),
      );
    }
    return id;
  }
}
