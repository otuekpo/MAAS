import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Logs, Trips } from "@app/database/mongodb";
import { User } from "@app/database/pg-entities";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  createResponse,
  createUnSuccessfulResponse,
  handle_catch_block,
} from "@app/shared/utilities/apiResponse";
import { HttpException, HttpStatus } from "@nestjs/common";
import { GetLogsDto } from "./dto/get-logs.dto";

const EXPORT_MAX_ROWS = 5000;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeCsv(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Trips.name) private readonly tripsModel: Model<Trips>,
    @InjectModel(Logs.name) private readonly logsModel: Model<Logs>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) { }

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

  async getLogs(dto: GetLogsDto) {
    try {
      
      const page = dto.page ?? 1;
      const limit = dto.limit ?? 20;
      const filter = this.buildLogFilter(dto);
      // console.log(filter, page, limit)
      
      const data = await this.logsModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
        console.log(data)
      const total = await this.logsModel.countDocuments(filter);
      console.log(total)
      return createResponse(true, "Logs fetched successfully", {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });

      // return createResponse(true, "", null)
    } catch (error: any) {
      return handle_catch_block(error)
    }
  }

  async getLogById(id: string) {
    try {
          if (!Types.ObjectId.isValid(id)) {
      const apiResponse = createUnSuccessfulResponse("Invalid log id");
      throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
    }

    const log = await this.logsModel.findById(id).lean();

    if (!log) {
      const apiResponse = createUnSuccessfulResponse("Log not found");
      throw new HttpException(apiResponse, HttpStatus.NOT_FOUND);
    }

    return createResponse(true, "Log fetched successfully", log);
    } catch (error:any) {
      return handle_catch_block(error)
    }
  }

  async exportLogs(dto: GetLogsDto) {
    const filter = this.buildLogFilter(dto);
    const logs = await this.logsModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(EXPORT_MAX_ROWS)
      .lean();

    const header = [
      "Timestamp",
      "User",
      "Action",
      "Module",
      "Status",
      "IP",
      "Status Code",
      "Duration (ms)",
      "Message",
      "Details",
    ];

    const rows = logs.map((log) => [
      (log as any).createdAt instanceof Date
        ? (log as any).createdAt.toISOString()
        : String((log as any).createdAt),
      log.email ?? log.user_id ?? "",
      log.action,
      log.module ?? "",
      log.status,
      log.ip_address ?? "",
      String(log.status_code ?? ""),
      String(log.duration_ms ?? ""),
      log.message ?? "",
      typeof log.data === "string" ? log.data : JSON.stringify(log.data ?? ""),
    ]);

    return [header, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
  }

  private buildLogFilter(dto: GetLogsDto): Record<string, unknown> {
    const conditions: Array<Record<string, unknown>> = [];

    if (dto.user) {
      conditions.push({
        email: { $regex: escapeRegex(dto.user), $options: "i" },
      });
    }

    if (dto.actionType) {
      conditions.push({ status: dto.actionType });
    }

    if (dto.module) {
      conditions.push({ module: dto.module });
    }

    if (dto.from || dto.to) {
      const createdAt: Record<string, Date> = {};
      if (dto.from) {
        createdAt.$gte = new Date(dto.from);
      }
      if (dto.to) {
        createdAt.$lte = new Date(dto.to);
      }
      conditions.push({ createdAt });
    }

    if (dto.search) {
      const regex = { $regex: escapeRegex(dto.search), $options: "i" };
      conditions.push({
        $or: [
          { action: regex },
          { message: regex },
          { email: regex },
          { ip_address: regex },
        ],
      });
    }

    return conditions.length > 0 ? { $and: conditions } : {};
  }
}
