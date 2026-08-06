import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({
    description: "The email of the user",
    example: "johndoe@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: "The one-time password token received via email",
    example: "abc123",
  })
  @IsString()
  @IsNotEmpty()
  otp!: string;

  @ApiProperty({
    description: "The new password. Must be at least 8 characters",
    example: "NewP@ssw0rd!",
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @IsNotEmpty()
  newPassword!: string;
}
