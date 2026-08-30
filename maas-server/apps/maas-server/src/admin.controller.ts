import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@app/shared/guards/jwt.guard";
import { RoleGuard } from "@app/shared/guards/role.guard";
import { Roles } from "@app/shared/decorators";
import { UserRole } from "@app/shared";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { GetLogsDto } from "./dto/get-logs.dto";

@Controller("admin")
@ApiTags("Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserRole.ADMIN_OFFICER, UserRole.SUPERADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("trips")
  @ApiOperation({ summary: "Get all trips with their users" })
  getAllTrips() {
    return this.adminService.getAllTrips();
  }

  @Get("logs")
  @ApiOperation({
    summary: "List audit logs",
    description:
      "Returns a paginated list of audit logs, filterable by search, user email, action type, module, and date range.",
  })
  getLogs(@Query() dto: GetLogsDto) {
    return this.adminService.getLogs(dto);
  }

  @Get("logs/export")
  @ApiOperation({ summary: "Export audit logs as CSV" })
  @ApiProduces("text/csv")
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", 'attachment; filename="audit-log.csv"')
  exportLogs(@Query() dto: GetLogsDto) {
    return this.adminService.exportLogs(dto);
  }

  @Get("logs/:id")
  @ApiOperation({ summary: "Get a single audit log by id" })
  @ApiParam({ name: "id", description: "MongoDB ObjectId of the log" })
  getLogDetail(@Param("id") id: string) {
    return this.adminService.getLogById(id);
  }
}
