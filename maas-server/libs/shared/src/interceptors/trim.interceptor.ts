import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Request } from "express";
import { Observable } from "rxjs";

export class TrimInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const ctx = context.switchToHttp();

    const req = ctx.getRequest<Request>();

    if (req.body && typeof req.body === "object") {
      for (const field in req.body) {
        if (typeof req.body[field] === "string") {
          req.body[field] = req.body[field].trim();
        }
      }
    }

    return next.handle();
  }
}
