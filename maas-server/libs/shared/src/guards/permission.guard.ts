// import {
//   CanActivate,
//   ExecutionContext,
//   HttpException,
//   HttpStatus,
//   Injectable,
// } from "@nestjs/common";
// import { Reflector } from "@nestjs/core";
// import { PERMISSION_METADATA } from "../decorators/permission";
// import { CustomRequest } from "../interfaces/customRequest";
// import { createUnSuccessfulResponse } from "../utilities";

// @Injectable()
// export class PermissionGuard implements CanActivate {
//   constructor(private reflector: Reflector) {}

//   canActivate(context: ExecutionContext): boolean {
//     const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
//       PERMISSION_METADATA,
//       [context.getHandler(), context.getClass()],
//     );

//     if (!requiredPermissions || requiredPermissions.length === 0) {
//       return true;
//     }

//     const req = context.switchToHttp().getRequest<CustomRequest>();
//     const user = req?.user;

//     if (!user) {
//       const apiResponse = createUnSuccessfulResponse("Authentication required");
//       throw new HttpException(apiResponse, HttpStatus.UNAUTHORIZED);
//     }

//     let hasPermission = false;

//     for (const permission of requiredPermissions) {
//       if (user.permissions && user.permissions.includes(permission)) {
//         hasPermission = true;
//         break;
//       }
//     }

//     if (!hasPermission) {
//       const apiResponse = createUnSuccessfulResponse(
//         "You do not have permission to access this resource",
//       );
//       throw new HttpException(apiResponse, HttpStatus.FORBIDDEN);
//     }

//     return true;
//   }
// }
