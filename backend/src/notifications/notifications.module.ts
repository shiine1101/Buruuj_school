import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MailService } from "./mail.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { SmsService } from "./sms.service";

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, MailService, SmsService],
  exports: [NotificationsService, MailService, SmsService]
})
export class NotificationsModule {}
