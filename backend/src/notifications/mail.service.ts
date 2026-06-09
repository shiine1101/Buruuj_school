import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

export type EmailDeliveryResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private createTransport() {
    const host = this.config.get<string>("SMTP_HOST");
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");
    if (!host || !user || !pass) return null;

    return nodemailer.createTransport({
      host,
      port: Number(this.config.get("SMTP_PORT", 587)),
      secure: this.config.get("SMTP_SECURE", "false") === "true",
      auth: { user, pass }
    });
  }

  async sendMail(to: string, subject: string, html: string): Promise<EmailDeliveryResult> {
    const from = this.config.get<string>("SMTP_FROM") ?? this.config.get<string>("SMTP_USER");
    const transport = this.createTransport();

    if (!transport || !from) {
      this.logger.warn(`Email skipped (SMTP not configured): ${subject} → ${to}`);
      return { success: false, error: "SMTP not configured" };
    }

    try {
      const result = await transport.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent: ${subject} → ${to}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email delivery failed";
      this.logger.error(`Email failed: ${subject} → ${to}: ${message}`);
      return { success: false, error: message };
    }
  }
}
