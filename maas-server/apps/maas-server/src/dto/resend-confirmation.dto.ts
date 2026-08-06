import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class ResendConfirmationDto {
  @ApiProperty({
    description: "The email of the user",
    example: "johndoe@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
