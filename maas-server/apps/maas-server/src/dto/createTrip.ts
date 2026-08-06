import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsNumber,
} from "class-validator";

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  route!: string;

  @IsString()
  @IsNotEmpty()
  transport!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  cost!: number;

  @IsString()
  @IsOptional()
  eta?: string;
}
