import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AppService } from "./app.service";
import { ApiOperation } from "@nestjs/swagger";
import { loginUserDto } from "./dto/login-user.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResendConfirmationDto } from "./dto/resend-confirmation.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { GetOTPDto } from "./dto/get-otp.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { JwtAuthGuard } from "@app/shared/guards/jwt.guard";
import { SkipThrottle, Throttle } from "@nestjs/throttler";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @SkipThrottle()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({
    summary: "Log in",
    description:
      "Authenticates a user with email and password. Returns a JWT token.",
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 15 * 60_000 } })
  @Post("login")
  async login(@Body() loginUserDto: loginUserDto, @Req() req: any) {
    return await this.appService.login(loginUserDto, req.ip);
  }

  @ApiOperation({
    summary: "Sign up",
    description: "Creates a new user account. Sends a confirmation email.",
  })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  @Post("signup")
  async signup(@Body() createUserDto: CreateUserDto) {
    return await this.appService.create_user_account(createUserDto);
  }

  @ApiOperation({
    summary: "Resend confirmation email",
    description: "Resends the email confirmation link to the user.",
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @Post("resend-confirmation")
  async resendConfirmation(
    @Body() resendConfirmationDto: ResendConfirmationDto,
  ) {
    return await this.appService.resend_user_confirmation_service(
      resendConfirmationDto,
    );
  }

  @ApiOperation({
    summary: "Verify email",
    description:
      "Verifies the user's email address using the token sent to their email.",
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 10 * 60_000 } })
  @Post("verify-email")
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return await this.appService.verify_email_service(verifyEmailDto);
  }

  @ApiOperation({
    summary: "Forgot password",
    description:
      "Sends a one-time password to the user's email for password reset.",
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @Post("forgot-password")
  async forgotPassword(@Body() getOTPDto: GetOTPDto, @Req() req: any) {
    return await this.appService.forget_password_service(getOTPDto, req.ip);
  }

  @ApiOperation({
    summary: "Reset password",
    description:
      "Resets the user's password using the one-time password received via email.",
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @Post("reset-password")
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: any,
  ) {
    return await this.appService.reset_user_password_service(
      resetPasswordDto,
      req.ip,
    );
  }

  @ApiOperation({
    summary: "Get user details",
    description: "Returns the authenticated user's profile information.",
  })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 50, ttl: 10 * 60_000 } })
  @Get("details")
  async getDetails(@Req() req: any) {
    return await this.appService.get_user_details(req.user.id);
  }
}
