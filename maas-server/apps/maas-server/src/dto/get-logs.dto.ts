import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class GetLogsDto {
  @ApiPropertyOptional({
    description: "Free-text search across action/message/email/IP",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by user email" })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({ enum: ["success", "failed", "blocked"] })
  @IsOptional()
  @IsIn(["success", "failed", "blocked"])
  actionType?: string;

  @ApiPropertyOptional({
    description: "Filter by module, e.g. Auth, Trips, Admin",
  })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: "Start of date range (ISO)" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "End of date range (ISO)" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
