import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsNumber,
} from "class-validator";

export class UpdateTripDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  route?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  transport?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsString()
  @IsOptional()
  eta?: string;
}
