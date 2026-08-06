import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class GetOTPDto {
  @ApiProperty({
    description: "The email of the user",
    example: "johndoe@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
