import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { createUnSuccessfulResponse } from "../utilities/apiResponse";

// Accepts only well-formed API keys.
const KEY_FORMAT = /^[A-Za-z0-9_-]{16,128}$/;

@Injectable()
export class ApiKeyGuard implements CanActivate {
  // envVar is the name of the env var that holds the expected key.
  constructor(private readonly envVar: string) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<any>();
    const apiKey = request.headers["x-api-key"];
    console.log(apiKey)
    const expectedKey = process.env[this.envVar];
    console.log(expectedKey)

    // Reject missing, malformed, or mismatched keys.
    if (
      apiKey !== expectedKey
    ) {
      const apiResponse = createUnSuccessfulResponse(
        "Missing or invalid API key",
      );
      throw new HttpException(apiResponse, HttpStatus.UNAUTHORIZED);
    }

    return true;
  }
}
