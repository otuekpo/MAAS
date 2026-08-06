import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLE_METADATA } from "../constants";
import { UserRole } from "../enums";
// import { Request } from "express";
import { CustomRequest } from "../interfaces/customRequest";
import { createUnSuccessfulResponse } from "../utilities/apiResponse";
// import { createUnSuccessfulResponse } from "../utilities";

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLE_METADATA,
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest<CustomRequest>();
    const user = req?.user;

    if (!user) {
      const apiResponse = createUnSuccessfulResponse("Authentication required");
      throw new HttpException(apiResponse, HttpStatus.UNAUTHORIZED);
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      // No roles specified — allow access
      return true;
    }

    /**
     * The user is authenticated but their role is not included in the list of required roles.
     * If one of the allowed roles is INVESTOR, we provide a more specific error message to guide the user.
     * This improves clarity by letting the user know exactly what role is needed to access the resource.
     */
    if (!requiredRoles.includes(user.role)) {
      const message = "You do not have permission to access this resource";

      // if (requiredRoles.includes(UserRole.NURSE)) {
      //   message = "You must be a medical practional to access this resource";
      // }

      const apiResponse = createUnSuccessfulResponse(message);
      throw new HttpException(apiResponse, HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
