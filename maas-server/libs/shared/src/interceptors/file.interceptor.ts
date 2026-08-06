// import { BadRequestException, CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
// import { Observable } from "rxjs";
// import { Request } from "express";

// export class CustomFileInterceptor implements NestInterceptor {
//   async intercept(
//     context: ExecutionContext,
//     next: CallHandler<any>
//   ): Promise<Observable<any>> {
//     const req = context.switchToHttp().getRequest<Request>();

//     if (!req.file) {
//         throw new BadRequestException("File is required");
//       }

//     return next.handle();
//   }
// }
