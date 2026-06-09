import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentsService } from "./payments.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("payments")
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}
  @Get() @Roles(Role.ADMIN, Role.FINANCIAL_OFFICER, Role.PARENT) findAll() { return this.service.findAll(); }
  @Get("revenue") @Roles(Role.ADMIN, Role.FINANCIAL_OFFICER) revenue() { return this.service.revenue(); }
  @Post() @Roles(Role.ADMIN, Role.FINANCIAL_OFFICER) create(@Body() dto: CreatePaymentDto) { return this.service.createPayment(dto); }
  @Patch(":id") @Roles(Role.ADMIN, Role.FINANCIAL_OFFICER) update(@Param("id") id: string, @Body() dto: Partial<CreatePaymentDto>) { return this.service.updatePayment(id, dto); }
}
