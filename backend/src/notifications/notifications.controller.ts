import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { NotificationsService } from "./notifications.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DRIVER, Role.FINANCIAL_OFFICER)
  findAll(@Query("limit") limit?: string) {
    return this.service.findAll(limit ? parseInt(limit, 10) : 50);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body() body: { title: string; body: string; event: string; channel?: string; sentTo?: string }
  ) {
    return this.service.create(body as Parameters<NotificationsService["create"]>[0]);
  }

  @Post("email")
  @Roles(Role.ADMIN)
  sendEmail(
    @Body() body: { to: string; subject: string; body: string; event: string; automatic?: boolean }
  ) {
    return this.service.sendEmail(body);
  }

  @Post("sms")
  @Roles(Role.ADMIN)
  sendSms(@Body() body: { to: string; body: string; event: string; automatic?: boolean }) {
    return this.service.sendSms(body);
  }

  @Delete("all")
  @Roles(Role.ADMIN)
  clearAll() {
    return this.service.clearAll();
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  deleteOne(@Param("id") id: string) {
    return this.service.deleteOne(id);
  }
}
