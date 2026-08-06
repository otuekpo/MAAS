import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from "class-validator";

export class CreateUserDto {
  @ApiProperty({
    description: "The email of the user",
    example: "johndoe@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: "The password of the user. Must be at least 8 characters",
    example: "johndoe123",
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    description: "Confirm password",
    example: "johndoe123",
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @IsNotEmpty()
  confirmpassword!: string;
}

export class CreateUserData {
  @ApiProperty({
    description: "The email of the user",
    example: "johndoe@example.com",
  })
  email!: string;

  @ApiProperty({
    description: "The password of the user. Must be at least 8 characters",
    example: "johndoe123",
  })
  password!: string;

  // lastName:string;
  // firstName:string;
}
