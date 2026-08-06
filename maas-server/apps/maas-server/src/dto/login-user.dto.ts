import { IsEmail, IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class loginUserDto {
  @ApiProperty({
    description: "Registered email address",
    example: "admin@university.edu",
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: "Account password (min 8 characters)",
    example: "P@ssw0rd!",
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;
}
