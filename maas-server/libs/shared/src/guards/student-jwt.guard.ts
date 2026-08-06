import {
  Injectable,
  CanActivate,
  ExecutionContext,
  // UnauthorizedException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "../enums";
import { createUnSuccessfulResponse } from "../utilities/apiResponse";

@Injectable()
export class StudentJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<any>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const apiResponse = createUnSuccessfulResponse(
        "Missing or invalid Authorization header",
      );
      throw new HttpException(apiResponse, HttpStatus.UNAUTHORIZED);
    }

    const token = authHeader.split(" ")[1];

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.SECRET_KEY ?? "",
      });

      if (payload.role !== UserRole.STUDENT) {
        const apiResponse = createUnSuccessfulResponse(
          "Invalid token for this resource",
        );
        throw new HttpException(apiResponse, HttpStatus.FORBIDDEN);
      }

      request.student = payload;

      return true;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error.name === "TokenExpiredError") {
        throw new HttpException(
          createUnSuccessfulResponse("Token has expired"),
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (error.name === "JsonWebTokenError") {
        throw new HttpException(
          createUnSuccessfulResponse("Invalid token"),
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new HttpException(
        createUnSuccessfulResponse("Something went wrong"),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
