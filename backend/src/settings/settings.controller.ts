import { Controller, Get, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller("settings")
export class SettingsController {
  @Get()
  getSettings() {
    return {
      modules: ["Users", "Roles", "Permissions", "Audit Logs", "Backup", "Academic Year", "Notification Settings", "School Information"],
      backups: ["Daily Backup", "Weekly Backup", "Backup History"]
    };
  }
}
