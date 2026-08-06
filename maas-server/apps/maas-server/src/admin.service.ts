import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Trips } from "@app/database/mongodb";
import { User } from "@app/database/pg-entities";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createResponse } from "@app/shared/utilities/apiResponse";

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Trips.name) private readonly tripsModel: Model<Trips>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async getAllTrips() {
    const [trips, users] = await Promise.all([
      this.tripsModel.find().sort({ createdAt: -1 }),
      this.userRepository.find({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = trips.map((trip) => ({
      ...trip.toObject(),
      user: userMap.get(trip.user_id) ?? null,
    }));

    return createResponse(true, "All trips fetched successfully", data);
  }
}
