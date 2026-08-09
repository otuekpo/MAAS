import { User } from "@app/database/pg-entities";
import {
  createResponse,
  createUnSuccessfulResponse,
  handle_catch_block,
} from "@app/shared/utilities/apiResponse";
import { COMMENT } from "@app/shared/constants/comments";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { loginUserDto } from "./dto/login-user.dto";
import { compare, hash } from "bcrypt";
import { UserRole } from "@app/shared";
import { JwtService } from "@nestjs/jwt";
import { CreateUserDto, CreateUserData } from "./dto/create-user.dto";
import { generateToken } from "@app/shared/utilities/generateToken";
import {
  ConfirmEmailModel,
  ResetPasswordEmailModel,
} from "@app/shared/interfaces/email-models";
import { EMAIL_TOKEN } from "@app/shared/constants/emailServiceToken";
import type {
  NewdevzEmail,
  SenderParameters,
} from "@app/shared/interfaces/email";
import { prepareHTML } from "@app/shared/utilities/insertContent";
import { SUBJECTS } from "@app/shared/constants/emailSubjects";
import { TEMPLATE } from "@app/shared/constants/template.names";
import { ResendConfirmationDto } from "./dto/resend-confirmation.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { GetOTPDto } from "./dto/get-otp.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { BruteForceService } from "./brute-force.service";

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
    @Inject(EMAIL_TOKEN) private readonly emailService: NewdevzEmail,
    private readonly bruteForce: BruteForceService,
  ) {}

  getHello(): string {
    return "Hello World!";
  }

  getExpiryDate(): Date {
    return new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  }

  private bfKeys(prefix: string, email: string, ip?: string): string[] {
    const keys = [`${prefix}:${email}`];
    if (ip) {
      keys.push(`${prefix}:ip:${ip}`);
    }
    return keys;
  }

  private async bruteForceGuard(prefix: string, email: string, ip?: string) {
    for (const key of this.bfKeys(prefix, email, ip)) {
      await this.bruteForce.guard(key);
    }
  }

  private async recordBruteForceFailure(
    prefix: string,
    email: string,
    ip?: string,
  ) {
    for (const key of this.bfKeys(prefix, email, ip)) {
      await this.bruteForce.recordFailure(key);
    }
  }

  private async resetBruteForceCounter(
    prefix: string,
    email: string,
    ip?: string,
  ) {
    for (const key of this.bfKeys(prefix, email, ip)) {
      await this.bruteForce.reset(key);
    }
  }

  async get_user_details(userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      if (!user) {
        const apiResponse = createUnSuccessfulResponse("User not found");
        throw new HttpException(apiResponse, HttpStatus.NOT_FOUND);
      }

      return createResponse(true, "User details fetched successfully", user);
    } catch (error) {
      handle_catch_block(error);
    }
  }

  async login({ email, password }: loginUserDto, ip?: string) {
    try {
      await this.bruteForceGuard("login", email, ip);

      const user = await this.userRepository.findOne({
        where: { email },
      });

      if (user === null) {
        await this.recordBruteForceFailure("login", email, ip);
        const apiResponse = createUnSuccessfulResponse(
          "A user with this email does not exist",
        );
        throw new HttpException(apiResponse, HttpStatus.NOT_FOUND);
      }

      if (user.disabled === true) {
        const data = {
          disabled: user.disabled,
          accessToken: null,
          refreshToken: null,
          email: user.email,
          is2FAEnabled: user.is2FAEnabled,
          role: user.role,
        };
        const apiResponse = createResponse(
          false,
          "Account disabled due to irregular activity. Please contact support.",
          data,
        );
        return apiResponse;
      }

      if (user.isEmailVerified === false) {
        const apiResponse = createUnSuccessfulResponse(
          "This account has not been verified",
        );
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      const isPassword = await compare(password, user.password);

      if (isPassword === false) {
        await this.recordBruteForceFailure("login", email, ip);
        const apiResponse = createUnSuccessfulResponse(
          "Incorrect email or password",
        );
        throw new HttpException(apiResponse, HttpStatus.UNAUTHORIZED);
      }

      await this.resetBruteForceCounter("login", email, ip);

      const tokens = await this.generateToken(user.id, user.email, user.role);

      const data = {
        token: tokens.accessToken,
        disabled: user.disabled,
        isEmailVerified: user.isEmailVerified,
        email: user.email,
      };

      const apiResponse = createResponse(true, "Login successful", data);
      return apiResponse;
    } catch (error: any) {
      handle_catch_block(error);
    }
  }

  async create_user_account(createUserDto: CreateUserDto) {
    const { email, password, confirmpassword } = createUserDto;
    try {
      if (!email || !confirmpassword || !password) {
        const apiResponse = createUnSuccessfulResponse("Invalid input");
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      if (
        email.trim() === "" ||
        password.trim() === "" ||
        confirmpassword.trim() === ""
      ) {
        const apiResponse = createUnSuccessfulResponse("Empty field");
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      if (password !== confirmpassword) {
        const apiResponse = createUnSuccessfulResponse(
          "Passwords do not match. please check password and confirm password fields",
        );
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      if (password.length < 8) {
        const apiResponse = createUnSuccessfulResponse(
          "Password must be at least 8 characters long",
        );
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      if (!this.passwordChecker(password)) {
        const apiResponse = createUnSuccessfulResponse(
          "Password must contain Uppercase, Lowercase, a symbol and should be a minimum of 8 characters",
        );
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }
      // iCreate user
      const CreateUserData: CreateUserData = {
        email: createUserDto.email,
        password: createUserDto.password,
        // firstName: createUserDto.firstName,
        // lastName: createUserDto.lastName
      };

      return await this.registerUser(CreateUserData);
    } catch (error) {
      console.error(error);
      if (error instanceof HttpException) {
        throw error;
      }
      const apiResponse = createUnSuccessfulResponse(
        "An unexpected error occured.",
      );
      throw new HttpException(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private passwordChecker(password: string): boolean {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/;
    return regex.test(password);
  }

  async verifyEmail(email: string) {
    return await this.userRepository.update(
      { email },
      {
        emailVerificationToken: "",
        isEmailVerified: true,
        emailVerificationTokenExpiry: null,
      },
    );
  }

  async findOneByEmail(email: string) {
    return await this.userRepository.findOne({
      where: {
        email,
      },
    });
  }
  async create(createUserDto: CreateUserData, token: string, expiresIn: Date) {
    const newUser = this.userRepository.create({
      ...createUserDto,
      emailVerificationToken: token,
      emailVerificationTokenExpiry: expiresIn,
    });
    return await this.userRepository.save(newUser);
  }

  async registerUser(createUserDto: CreateUserData) {
    try {
      const user = await this.findOneByEmail(createUserDto.email);

      if (user && user.disabled === true) {
        const apiResponse = createUnSuccessfulResponse(
          "Account disabled due to irregular activity. Please contact support.",
        );
        throw new HttpException(apiResponse, HttpStatus.FORBIDDEN);
      }

      if (user !== null) {
        const apiResponse = createUnSuccessfulResponse(
          "A user with this email already exists",
        );
        throw new HttpException(apiResponse, HttpStatus.CONFLICT);
      }

      const hashedPassword = await hash(createUserDto.password, 10);
      createUserDto.password = hashedPassword;

      const token = generateToken();
      const tokenExpiresIn = this.getExpiryDate();

      const newUser = await this.create(createUserDto, token, tokenExpiresIn);

      if (!newUser) {
        const apiResponse = createUnSuccessfulResponse(
          "User cannot be created",
        );
        throw new HttpException(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const emailData: ConfirmEmailModel = {
        email: newUser.email,
        token,
        firstName: newUser.firstName ?? "User",
      };

      try {
        await this.emailConfirmationSender(emailData);
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }

      const apiResponse = createResponse(true, "User created", {
        id: newUser.id,
        email: newUser.email,
      });
      return apiResponse;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const apiResponse = createUnSuccessfulResponse("Something went wrong");
      throw new HttpException(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async generateToken(id: string, email: string, role: UserRole) {
    const payload = { id, email, role };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.SECRET_KEY ?? "",
      expiresIn: "5h",
    });

    return {
      accessToken,
    };
  }

  private async emailConfirmationSender(data: ConfirmEmailModel) {
    const emailParameters = {
      name: data.firstName,
      callback: data.token,
    };

    await this.sender(
      data.email,
      SUBJECTS.CONFIRMATION_EMAIL,
      TEMPLATE.CONFIRMATION_EMAIL_NAME,
      emailParameters,
    );
  }

  private async sender(
    to: string,
    subject: string,
    templateName: string,
    emailParameters: any,
  ) {
    const html = prepareHTML(templateName, emailParameters);

    const params: SenderParameters = {
      html,
      subject,
      to,
    };
    await this.emailService.sendEmail(params);
  }

  // private set_email_to_lowercase(email: string): string {
  //   return email.toLowerCase();
  // }

  private async setEmailToken(email: string, token: string, expiresIn: Date) {
    return await this.userRepository.update(
      { email },
      {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: expiresIn,
      },
    );
  }

  private async hashPassword(password: string): Promise<string> {
    return await hash(password, 10);
  }

  private async updateUserById(id: string, data: Partial<User>) {
    return await this.userRepository.update({ id }, data);
  }

  private async verifyUser(dto: VerifyEmailDto) {
    const user = await this.findOneByEmail(dto.email);

    if (user === null) {
      const apiResponse = createUnSuccessfulResponse(
        "A user with this email does not exist",
      );
      throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
    }

    if (user.isEmailVerified === true) {
      const apiResponse = createUnSuccessfulResponse(
        "This email is already verified",
      );
      throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
    }

    if (user.emailVerificationToken !== dto.token) {
      const apiResponse = createUnSuccessfulResponse(
        "Invalid verification token",
      );
      throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
    }

    if (
      user.emailVerificationTokenExpiry &&
      user.emailVerificationTokenExpiry < new Date()
    ) {
      const apiResponse = createUnSuccessfulResponse(COMMENT.TOKEN_EXPIRED);
      throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
    }

    await this.verifyEmail(dto.email);
    return createResponse(true, "Email verified successfully", true);
  }

  private async resetPasswordSender(data: ResetPasswordEmailModel) {
    const emailParameters = {
      name: data.firstName,
      token: data.token,
      expiresIn: data.expiresIn,
    };

    await this.sender(
      data.email,
      SUBJECTS.RESET_EMAIL,
      TEMPLATE.RESET_EMAIL_NAME,
      emailParameters,
    );
  }

  async resend_user_confirmation_service(
    resendConfirmationDto: ResendConfirmationDto,
  ) {
    if (!resendConfirmationDto.email) {
      const apiResponse = createUnSuccessfulResponse(COMMENT.CHECK_INPUT);
      throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
    }

    // resendConfirmationDto.email = this.set_email_to_lowercase(
    //   resendConfirmationDto.email
    // );

    try {
      const user = await this.findOneByEmail(resendConfirmationDto.email);

      if (user === null) {
        const apiResponse = createUnSuccessfulResponse(
          "A user with this email does not exist",
        );
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }
      if (user?.disabled === true) {
        const apiResponse = createUnSuccessfulResponse(
          "Account disabled due to irregular activity. Please contact support.",
        );
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      if (user?.isEmailVerified === true) {
        const apiResponse = createUnSuccessfulResponse(
          "This email is already verified",
        );
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      const token = generateToken();
      const expiresIn = new Date(Date.now() + 60 * 60 * 1000);

      const updateUser = await this.setEmailToken(
        resendConfirmationDto.email,
        token,
        expiresIn,
      );

      if (!updateUser.affected || updateUser.affected === 0) {
        const apiResponse = createUnSuccessfulResponse(
          "Token field not updated",
        );
        throw new HttpException(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      if (!user) {
        const apiResponse = createUnSuccessfulResponse(
          "A user with this email does not exist",
        );
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      const emailData: ConfirmEmailModel = {
        email: user.email,
        token,
        firstName: user.firstName ?? "User",
      };

      await this.emailConfirmationSender(emailData);

      return createResponse(true, "Email sent successfully", true);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const apiResponse = createUnSuccessfulResponse(
        COMMENT.INTERNAL_ERROR_COMMENT,
      );
      throw new HttpException(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verify_email_service(verifyUserDto: VerifyEmailDto) {
    try {
      const { email, token } = verifyUserDto;

      if (!email || !token) {
        const apiResponse = createUnSuccessfulResponse(COMMENT.CHECK_INPUT);
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }
      verifyUserDto.email = verifyUserDto.email.toLowerCase();

      return await this.verifyUser(verifyUserDto);
    } catch (error: any) {
      handle_catch_block(error);
    }
  }

  async forget_password_service(dto: GetOTPDto, ip?: string) {
    try {
      if (!dto.email) {
        const apiResponse = createUnSuccessfulResponse(
          COMMENT.EMAIL_IS_REQUIRED,
        );
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      await this.bruteForceGuard("forgot-password", dto.email, ip);

      // dto.email = this.set_email_to_lowercase(dto.email);

      const user = await this.findOneByEmail(dto.email);

      if (!user) {
        await this.recordBruteForceFailure("forgot-password", dto.email, ip);
        const apiResponse = createUnSuccessfulResponse(COMMENT.USER_NOT_FOUND);
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }
      const token = generateToken();
      const expiresIn = new Date(Date.now() + 60 * 60 * 1000);

      const updateUser = await this.updateUserById(user.id, {
        passwordResetToken: token,
        passwordResetTokenExpiry: expiresIn,
      });

      if (!updateUser || updateUser.affected === 0) {
        const apiResponse = createUnSuccessfulResponse(
          "Something went wrong, The user was not updated.",
        );
        throw new HttpException(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      await this.resetBruteForceCounter("forgot-password", dto.email, ip);

      const emailData: ResetPasswordEmailModel = {
        email: user.email,
        token,
        expiresIn,
        firstName: user.firstName,
      };

      await this.resetPasswordSender(emailData);

      return createResponse(true, "Sent One time code to your email", true);
    } catch (error: any) {
      handle_catch_block(error);
    }
  }

  async reset_user_password_service(
    resetUserDTO: ResetPasswordDto,
    ip?: string,
  ) {
    const { otp: token, newPassword } = resetUserDTO;

    if (!resetUserDTO.email || !token || !newPassword) {
      const apiResponse = createUnSuccessfulResponse(COMMENT.CHECK_INPUT);
      throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
    }

    // resetUserDTO.email = this.set_email_to_lowercase(
    //   resetUserDTO.email
    // );

    try {
      await this.bruteForceGuard("reset-password", resetUserDTO.email, ip);

      const user = await this.findOneByEmail(resetUserDTO.email);
      if (user === null) {
        const apiResponse = createUnSuccessfulResponse("User not found");
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      if (
        user.passwordResetToken === null ||
        user.passwordResetToken !== token
      ) {
        await this.recordBruteForceFailure(
          "reset-password",
          resetUserDTO.email,
          ip,
        );
        const apiResponse = createUnSuccessfulResponse(
          "Password reset token is invalid or has already been used.",
        );
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      if (
        user.passwordResetTokenExpiry &&
        user.passwordResetTokenExpiry < new Date()
      ) {
        const apiResponse = createUnSuccessfulResponse(COMMENT.TOKEN_EXPIRED);
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      if (!this.passwordChecker(newPassword)) {
        const apiResponse = createUnSuccessfulResponse(
          COMMENT.UNQUALIFIED_PASSWORD,
        );
        throw new HttpException(apiResponse, HttpStatus.BAD_REQUEST);
      }

      const hashedPassword = await this.hashPassword(newPassword);

      const changeUserPassword = await this.updateUserById(user.id, {
        passwordResetToken: null as any,
        passwordResetTokenExpiry: null,
        password: hashedPassword,
      });

      if (!changeUserPassword || changeUserPassword.affected === 0) {
        const apiResponse = createUnSuccessfulResponse(
          "Password reset token is invalid or has already been used.",
        );
        throw new HttpException(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      await this.resetBruteForceCounter(
        "reset-password",
        resetUserDTO.email,
        ip,
      );

      return createResponse(true, "Password updated", true);
    } catch (error: any) {
      handle_catch_block(error);
    }
  }
}
