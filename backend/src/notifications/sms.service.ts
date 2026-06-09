import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type SmsDeliveryResult = {
  success: boolean;
  providerId?: string;
  error?: string;
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  async sendSms(to: string, body: string): Promise<SmsDeliveryResult> {
    const provider = this.config.get<string>("SMS_PROVIDER", "log");
    const apiKey = this.config.get<string>("SMS_API_KEY");
    const senderId = this.config.get<string>("SMS_SENDER_ID", "BURUUJ");

    if (provider === "log" || !apiKey) {
      this.logger.log(`SMS [simulated] ${senderId} → ${to}: ${body}`);
      return { success: true, providerId: `sim-${Date.now()}` };
    }

    try {
      if (provider === "africastalking") {
        const response = await fetch("https://api.africastalking.com/version1/messaging", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            apiKey
          },
          body: new URLSearchParams({ username: this.config.get("SMS_USERNAME", "sandbox") ?? "sandbox", to, message: body, from: senderId })
        });
        const data = (await response.json()) as { SMSMessageData?: { Recipients?: Array<{ messageId?: string; status?: string }> } };
        if (!response.ok) throw new Error(JSON.stringify(data));
        return { success: true, providerId: data.SMSMessageData?.Recipients?.[0]?.messageId };
      }

      this.logger.warn(`Unsupported SMS provider: ${provider}`);
      return { success: false, error: `Unsupported SMS provider: ${provider}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : "SMS delivery failed";
      this.logger.error(`SMS failed → ${to}: ${message}`);
      return { success: false, error: message };
    }
  }
}
