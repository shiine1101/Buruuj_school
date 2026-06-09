import { Controller, Get, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ReportsService } from "./reports.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Get("dashboard") @Roles(Role.ADMIN, Role.FINANCIAL_OFFICER) dashboard() { return this.service.dashboard(); }
}
