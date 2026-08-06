import { SetMetadata } from "@nestjs/common";
import { ROLE_METADATA } from "../constants";
import { UserRole } from "../enums";

export const Roles = (...roles: UserRole[]) =>
  SetMetadata(ROLE_METADATA, roles);
