import { HttpException, InternalServerErrorException } from "@nestjs/common";
import { aResponse } from "../interfaces";
import { CATCH_BLOCK_MESSAGE } from "../constants/catch_block";

export function createResponse<T>(
  successful: boolean,
  message: string,
  data: T,
): aResponse<T> {
  return { successful, message, data };
}

export function createUnSuccessfulResponse(message: string): aResponse<null> {
  return {
    data: null,
    message,
    successful: false,
  };
}

export function handle_catch_block(error: Error) {
  if (error instanceof HttpException) {
    throw error;
  }
  console.error(error);
  throw new InternalServerErrorException(CATCH_BLOCK_MESSAGE);
}
