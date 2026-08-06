import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class VerifyEmailDto {
  @ApiProperty({
    description: "The email of the user",
    example: "johndoe@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: "The email verification token",
    example: "abc123",
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
