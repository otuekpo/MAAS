import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { catchError, Observable, of } from "rxjs";
import { Response } from "express";
import { createUnSuccessfulResponse } from "../utilities/apiResponse";

export class ErrorResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorResponseInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const ctx = context.switchToHttp();
    const res = ctx.getResponse<Response>();

    return next.handle().pipe(
      catchError((err, _) => {
        let status = 500;
        let message = "Internal Server Error";

        if (err instanceof HttpException) {
          status = err.getStatus();
          const response = err.getResponse();
          if (typeof response === "string") {
            message = response;
          } else if (response && typeof response === "object") {
            message = (response as any).message?.toString() || message;
          }
        } else if (err.message) {
          message = String(err.message);
        }

        if (status >= 500) {
          this.logger.error(`[${status}] ${message}`, err.stack);
        }

        res.status(status).json(createUnSuccessfulResponse(message));
        return of();
      }),
    );
  }
}
