import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "./mail.service";
import { SmsService } from "./sms.service";

export type NotificationChannel = "in-app" | "sms" | "whatsapp" | "email";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly sms: SmsService
  ) {}

  async findAll(limit = 50) {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: limit
    });
  }

  async create(data: {
    title: string;
    body: string;
    channel?: NotificationChannel;
    event: string;
    sentTo?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        title: data.title,
        body: data.body,
        channel: data.channel ?? "in-app",
        event: data.event,
        sentTo: data.sentTo ?? null
      }
    });
  }

  async deleteOne(id: string) {
    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }

  async clearAll() {
    await this.prisma.notification.deleteMany({});
    return { success: true };
  }

  async sendEmail(payload: {
    to: string;
    subject: string;
    body: string;
    event: string;
    automatic?: boolean;
  }) {
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="color:#2563eb;margin-bottom:8px">${payload.subject}</h2>
      <p>${payload.body}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
      <p style="font-size:12px;color:#64748b">Buruuj School Bus Management System</p>
    </div>`;

    const result = await this.mail.sendMail(payload.to, payload.subject, html);
    const notification = await this.create({
      title: payload.subject,
      body: `${payload.body}${result.success ? "" : ` (failed: ${result.error})`}`,
      channel: "email",
      event: payload.event,
      sentTo: payload.to
    });

    return { ...result, notification };
  }

  async sendSms(payload: {
    to: string;
    body: string;
    event: string;
    automatic?: boolean;
  }) {
    const result = await this.sms.sendSms(payload.to, payload.body);
    const notification = await this.create({
      title: "SMS Notification",
      body: `${payload.body}${result.success ? "" : ` (failed: ${result.error})`}`,
      channel: "sms",
      event: payload.event,
      sentTo: payload.to
    });

    return { ...result, notification };
  }
}
