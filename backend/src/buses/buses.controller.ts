import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { BusesService } from "./buses.service";
import { CreateBusDto } from "./dto/create-bus.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("buses")
export class BusesController {
  constructor(private readonly service: BusesService) {}
  @Get() @Roles(Role.ADMIN, Role.DRIVER) findAll(@CurrentUser() user: { id: string; role: Role }) { return this.service.findAll(user); }
  @Post() @Roles(Role.ADMIN) create(@Body() dto: CreateBusDto) { return this.service.createBus(dto); }
  @Patch(":id") @Roles(Role.ADMIN) update(@Param("id") id: string, @Body() dto: Partial<CreateBusDto>) { return this.service.updateBus(id, dto); }
  @Patch(":id/archive") @Roles(Role.ADMIN) archive(@Param("id") id: string) { return this.service.archive(id); }
}
