import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AttendanceService } from "./attendance.service";
import { CreateAttendanceDto } from "./dto/create-attendance.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}
  @Get() @Roles(Role.ADMIN, Role.DRIVER, Role.PARENT) findAll(@CurrentUser() user: { id: string; role: Role }) { return this.service.findAll(user); }
  @Post() @Roles(Role.ADMIN, Role.DRIVER) mark(@Body() dto: CreateAttendanceDto, @CurrentUser() user: { id: string; role: Role }) { return this.service.mark(dto, user); }
}
