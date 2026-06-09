import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AiService } from "./ai.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("ai")
export class AiController {
  constructor(private readonly service: AiService) {}
  @Post("ask") @Roles(Role.ADMIN) ask(@Body("prompt") prompt: string) { return this.service.answer(prompt); }
}
