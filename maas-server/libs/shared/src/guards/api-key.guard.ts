import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { createUnSuccessfulResponse } from "../utilities/apiResponse";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<any>();
    const apiKey = request.headers["x-api-header"];
    const expectedKey = process.env.FINGERPRINT_API_KEY;

    if (!apiKey || apiKey !== expectedKey) {
      const apiResponse = createUnSuccessfulResponse(
        "Missing or invalid API key",
      );
      throw new HttpException(apiResponse, HttpStatus.UNAUTHORIZED);
    }

    return true;
  }
}
