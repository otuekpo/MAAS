import {
  Injectable,
  CanActivate,
  ExecutionContext,
  // UnauthorizedException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
// import { Request, Response } from "express";
import * as dotenv from "dotenv";
import { createUnSuccessfulResponse } from "../utilities/apiResponse";
dotenv.config();

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {
    if (process.env.SECRET_KEY === undefined) {
      // const apiResponse = createUnSuccessfulResponse("Missing JWT secret key");
      throw new Error("SECRET KEY is required.");
    }
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
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
      if (process.env.SECRET_KEY === undefined) {
        const apiResponse = createUnSuccessfulResponse(
          "Missing JWT secret key",
        );
        throw new HttpException(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.SECRET_KEY,
      });

      request.user = payload; // attach decoded JWT to request

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
