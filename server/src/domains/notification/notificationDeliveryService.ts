import type { PushNotificationPayload, TelegramSendReport } from "shared";
import {
  PushNotificationService,
  type PushDeliveryReport,
  type VapidDetails,
} from "../push-notification/pushNotificationService";
import { TelegramNotificationService } from "../telegram-notification/telegramNotificationService";

export type NotificationDeliveryReport = {
  push: PushDeliveryReport;
  telegram: TelegramSendReport;
  attempted: number;
  delivered: number;
  failed: number;
  skipped: number;
};

type SendNotificationOptions = {
  locale?: string;
  vapidDetails: VapidDetails;
};

export class NotificationDeliveryService {
  static async sendNotification(
    userId: string,
    payload: PushNotificationPayload,
    options: SendNotificationOptions,
  ): Promise<NotificationDeliveryReport> {
    const [push, telegram] = await Promise.all([
      this.sendPushSafely(userId, payload, options.vapidDetails),
      this.sendTelegramSafely(userId, payload, options.locale),
    ]);

    const report: NotificationDeliveryReport = {
      push,
      telegram,
      attempted: push.attempted + telegram.attempted,
      delivered: push.delivered + telegram.delivered,
      failed: push.failed + telegram.failed,
      skipped: telegram.skipped,
    };

    if (report.failed > 0) {
      console.error("Notification delivery had failures", {
        userId,
        report,
      });
    }

    return report;
  }

  private static async sendPushSafely(
    userId: string,
    payload: PushNotificationPayload,
    vapidDetails: VapidDetails,
  ): Promise<PushDeliveryReport> {
    try {
      return await PushNotificationService.sendNotification(
        userId,
        payload,
        vapidDetails,
      );
    } catch (error) {
      return {
        attempted: 0,
        delivered: 0,
        failed: 1,
        removed: 0,
        failures: [
          {
            endpoint: "internal",
            status: 0,
            statusText: "Push send failed",
            reason: error instanceof Error ? error.message : "Unknown error",
          },
        ],
      };
    }
  }

  private static async sendTelegramSafely(
    userId: string,
    payload: PushNotificationPayload,
    locale?: string,
  ): Promise<TelegramSendReport> {
    try {
      return await TelegramNotificationService.sendPushPayloadAsTelegramMessage(
        userId,
        payload,
        locale,
      );
    } catch (error) {
      return {
        attempted: 1,
        delivered: 0,
        failed: 1,
        skipped: 0,
        reason:
          error instanceof Error
            ? error.message
            : "Unknown telegram delivery error",
      };
    }
  }
}
