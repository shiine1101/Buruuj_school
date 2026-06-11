import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { StudentsModule } from "./students/students.module";
import { DriversModule } from "./drivers/drivers.module";
import { BusesModule } from "./buses/buses.module";
import { MaintenanceModule } from "./maintenance/maintenance.module";
import { PaymentsModule } from "./payments/payments.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { ReportsModule } from "./reports/reports.module";
import { AiModule } from "./ai/ai.module";
import { SettingsModule } from "./settings/settings.module";
import { LiveTrackingModule } from "./live-tracking/live-tracking.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { UsersModule } from "./users/users.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    StudentsModule,
    DriversModule,
    BusesModule,
    MaintenanceModule,
    PaymentsModule,
    AttendanceModule,
    ReportsModule,
    AiModule,
    SettingsModule,
    LiveTrackingModule,
    NotificationsModule,
    UsersModule,
    HealthModule,
  ],
})
export class AppModule {}
