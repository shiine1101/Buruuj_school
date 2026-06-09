import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateBreakdownDto } from "./dto/create-breakdown.dto";
import { CreateFuelRecordDto } from "./dto/create-fuel-record.dto";
import { MaintenanceService } from "./maintenance.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("maintenance")
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}
  @Get("fuel") @Roles(Role.ADMIN, Role.FINANCIAL_OFFICER, Role.DRIVER) fuelRecords(@CurrentUser() user: { id: string; role: Role }) { return this.service.fuelRecords(user); }
  @Get("breakdowns") @Roles(Role.ADMIN, Role.FINANCIAL_OFFICER, Role.DRIVER) breakdowns(@CurrentUser() user: { id: string; role: Role }) { return this.service.breakdowns(user); }
  @Get("summary") @Roles(Role.ADMIN, Role.FINANCIAL_OFFICER) summary() { return this.service.summary(); }
  @Post("fuel") @Roles(Role.ADMIN, Role.FINANCIAL_OFFICER, Role.DRIVER) createFuel(@Body() dto: CreateFuelRecordDto, @CurrentUser() user: { id: string; role: Role }) { return this.service.createFuel(dto, user); }
  @Post("breakdowns") @Roles(Role.ADMIN, Role.FINANCIAL_OFFICER, Role.DRIVER) createBreakdown(@Body() dto: CreateBreakdownDto, @CurrentUser() user: { id: string; role: Role }) { return this.service.createBreakdown(dto, user); }
}
