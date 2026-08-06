import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { Request } from "express";
import { Observable } from "rxjs";

export class EmailInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();

    if (req.body && req.body.email && typeof req.body.email === "string") {
      req.body.email = (req.body.email as string).toLowerCase();
    }

    return next.handle();
  }
}
