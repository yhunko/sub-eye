import { afterEach, describe, expect, it } from "bun:test";
import type { PushNotificationPayload } from "shared";
import { NotificationDeliveryService } from "../src/domains/notification/notificationDeliveryService";
import { PushNotificationService } from "../src/domains/push-notification/pushNotificationService";
import { TelegramNotificationService } from "../src/domains/telegram-notification/telegramNotificationService";

const originalPushSend = PushNotificationService.sendNotification;
const originalTelegramSend =
  TelegramNotificationService.sendPushPayloadAsTelegramMessage;

const samplePayload: PushNotificationPayload = {
  title: "Renewal reminder",
  body: "Your subscription renews tomorrow",
  data: { url: "/subscriptions/sub_01" },
};

const mockVapidDetails = {
  subject: "mailto:test@example.com",
  publicKey: "mock-public-key",
  privateKey: "mock-private-key",
};

afterEach(() => {
  (
    PushNotificationService as unknown as {
      sendNotification: typeof PushNotificationService.sendNotification;
    }
  ).sendNotification = originalPushSend;

  (
    TelegramNotificationService as unknown as {
      sendPushPayloadAsTelegramMessage: typeof TelegramNotificationService.sendPushPayloadAsTelegramMessage;
    }
  ).sendPushPayloadAsTelegramMessage = originalTelegramSend;
});

describe("NotificationDeliveryService.sendNotification", () => {
  it("forwards locale to Telegram delivery", async () => {
    let receivedLocale: string | undefined;

    (
      PushNotificationService as unknown as {
        sendNotification: typeof PushNotificationService.sendNotification;
      }
    ).sendNotification = async () => ({
      attempted: 0,
      delivered: 0,
      failed: 0,
      removed: 0,
      failures: [],
    });

    (
      TelegramNotificationService as unknown as {
        sendPushPayloadAsTelegramMessage: typeof TelegramNotificationService.sendPushPayloadAsTelegramMessage;
      }
    ).sendPushPayloadAsTelegramMessage = async (_userId, _payload, locale) => {
      receivedLocale = locale;
      return {
        attempted: 1,
        delivered: 1,
        failed: 0,
        skipped: 0,
      };
    };

    await NotificationDeliveryService.sendNotification(
      "user_01",
      samplePayload,
      {
        locale: "uk",
        vapidDetails: mockVapidDetails,
      },
    );

    expect(receivedLocale).toBe("uk");
  });

  it("aggregates push and telegram delivery stats", async () => {
    (
      PushNotificationService as unknown as {
        sendNotification: typeof PushNotificationService.sendNotification;
      }
    ).sendNotification = async () => ({
      attempted: 2,
      delivered: 1,
      failed: 1,
      removed: 0,
      failures: [],
    });

    (
      TelegramNotificationService as unknown as {
        sendPushPayloadAsTelegramMessage: typeof TelegramNotificationService.sendPushPayloadAsTelegramMessage;
      }
    ).sendPushPayloadAsTelegramMessage = async () => ({
      attempted: 1,
      delivered: 1,
      failed: 0,
      skipped: 0,
    });

    const report = await NotificationDeliveryService.sendNotification(
      "user_01",
      samplePayload,
      { vapidDetails: mockVapidDetails },
    );

    expect(report.attempted).toBe(3);
    expect(report.delivered).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.skipped).toBe(0);
  });

  it("returns failed telegram report when telegram delivery throws", async () => {
    (
      PushNotificationService as unknown as {
        sendNotification: typeof PushNotificationService.sendNotification;
      }
    ).sendNotification = async () => ({
      attempted: 0,
      delivered: 0,
      failed: 0,
      removed: 0,
      failures: [],
    });

    (
      TelegramNotificationService as unknown as {
        sendPushPayloadAsTelegramMessage: typeof TelegramNotificationService.sendPushPayloadAsTelegramMessage;
      }
    ).sendPushPayloadAsTelegramMessage = async () => {
      throw new Error("telegram unavailable");
    };

    const report = await NotificationDeliveryService.sendNotification(
      "user_02",
      samplePayload,
      { vapidDetails: mockVapidDetails },
    );

    expect(report.telegram.delivered).toBe(0);
    expect(report.telegram.failed).toBe(1);
    expect(report.telegram.reason).toContain("telegram unavailable");
    expect(report.failed).toBe(1);
  });
});
