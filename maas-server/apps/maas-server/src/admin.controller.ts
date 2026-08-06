import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@app/shared/guards/jwt.guard";
import { RoleGuard } from "@app/shared/guards/role.guard";
import { Roles } from "@app/shared/decorators";
import { UserRole } from "@app/shared";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserRole.ADMIN_OFFICER, UserRole.SUPERADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("trips")
  getAllTrips() {
    return this.adminService.getAllTrips();
  }
}
