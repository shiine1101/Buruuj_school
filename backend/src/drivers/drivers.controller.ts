import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateDriverDto } from "./dto/create-driver.dto";
import { DriversService } from "./drivers.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("drivers")
export class DriversController {
  constructor(private readonly service: DriversService) {}
  @Get() @Roles(Role.ADMIN) findAll() { return this.service.findAll(); }
  @Get("dashboard") @Roles(Role.DRIVER) dashboard(@CurrentUser() user: { id: string }) { return this.service.dashboard(user.id); }
  @Post() @Roles(Role.ADMIN) create(@Body() dto: CreateDriverDto) { return this.service.createDriver(dto); }
  @Patch(":id") @Roles(Role.ADMIN) update(@Param("id") id: string, @Body() dto: Partial<CreateDriverDto>) { return this.service.updateDriver(id, dto); }
  @Patch(":id/archive") @Roles(Role.ADMIN) archive(@Param("id") id: string) { return this.service.archive(id); }
}
