import {
  IsArray,
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class IngestSensorEventDto {
  @IsString()
  @IsNotEmpty()
  trip_id!: string;

  @IsString()
  @IsNotEmpty()
  origin!: string;

  @IsString()
  @IsNotEmpty()
  destination!: string;

  @IsString()
  @IsNotEmpty()
  transport!: string;

  @IsNumber()
  @Min(0)
  distance_miles!: number;

  @IsOptional()
  @IsNumber()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsNumber()
  @IsLongitude()
  lng?: number;

  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export class IngestSensorDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestSensorEventDto)
  events!: IngestSensorEventDto[];
}
