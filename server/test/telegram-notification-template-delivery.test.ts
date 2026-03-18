import { afterEach, describe, expect, it } from "bun:test";
import type { PushNotificationPayload } from "shared";
import { TelegramBotService } from "../src/domains/telegram-notification/telegramBotService";
import { TelegramNotificationRepository } from "../src/domains/telegram-notification/telegramNotificationRepository";
import { TelegramNotificationService } from "../src/domains/telegram-notification/telegramNotificationService";
import { UserService } from "../src/domains/user/userService";

const originalFindLinkByUserId =
  TelegramNotificationRepository.findLinkByUserId;
const originalSendMessage = TelegramBotService.sendMessage;
const originalGetPlanId = UserService.getPlanId;

const createPayload = (): PushNotificationPayload => {
  const renewalDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    title: "Subscription Renewal",
    body: "Your subscription renews tomorrow.",
    data: {
      url: "/subscriptions/sub_01",
      telegramTemplateContext: {
        kind: "renewal",
        subscriptionName: "1Password",
        renewalDate,
        timezone: "UTC",
        preferredPrice: {
          amount: 9.99,
          currencyCode: "usd",
        },
        originalPrice: {
          amount: 9.99,
          currencyCode: "usd",
        },
      },
    },
  };
};

afterEach(() => {
  (
    TelegramNotificationRepository as unknown as {
      findLinkByUserId: typeof TelegramNotificationRepository.findLinkByUserId;
    }
  ).findLinkByUserId = originalFindLinkByUserId;

  (
    TelegramBotService as unknown as {
      sendMessage: typeof TelegramBotService.sendMessage;
    }
  ).sendMessage = originalSendMessage;

  (
    UserService as unknown as {
      getPlanId: typeof UserService.getPlanId;
    }
  ).getPlanId = originalGetPlanId;
});

describe("TelegramNotificationService template delivery", () => {
  it("falls back to default template on free plan", async () => {
    let sentMessage = "";

    (
      TelegramNotificationRepository as unknown as {
        findLinkByUserId: typeof TelegramNotificationRepository.findLinkByUserId;
      }
    ).findLinkByUserId = async () =>
      ({
        id: 1,
        userId: "user_1",
        chatId: "chat_1",
        telegramUserId: "tg_1",
        telegramUsername: "subeye",
        isEnabled: true,
        messageTemplate: {
          version: 1,
          template: "CUSTOM {subscription_name}",
        },
      }) as never;

    (
      UserService as unknown as {
        getPlanId: typeof UserService.getPlanId;
      }
    ).getPlanId = async () => "free";

    (
      TelegramBotService as unknown as {
        sendMessage: typeof TelegramBotService.sendMessage;
      }
    ).sendMessage = async (_chatId, text) => {
      sentMessage = text;
      return { ok: true };
    };

    const report =
      await TelegramNotificationService.sendPushPayloadAsTelegramMessage(
        "user_1",
        createPayload(),
        "en",
      );

    expect(report.delivered).toBe(1);
    expect(sentMessage).not.toContain("CUSTOM");
    expect(sentMessage).toContain("1Password");
  });

  it("uses custom template on plus plan", async () => {
    let sentMessage = "";

    (
      TelegramNotificationRepository as unknown as {
        findLinkByUserId: typeof TelegramNotificationRepository.findLinkByUserId;
      }
    ).findLinkByUserId = async () =>
      ({
        id: 1,
        userId: "user_1",
        chatId: "chat_1",
        telegramUserId: "tg_1",
        telegramUsername: "subeye",
        isEnabled: true,
        messageTemplate: {
          version: 1,
          template: "CUSTOM {subscription_name}",
        },
      }) as never;

    (
      UserService as unknown as {
        getPlanId: typeof UserService.getPlanId;
      }
    ).getPlanId = async () => "plus";

    (
      TelegramBotService as unknown as {
        sendMessage: typeof TelegramBotService.sendMessage;
      }
    ).sendMessage = async (_chatId, text) => {
      sentMessage = text;
      return { ok: true };
    };

    const report =
      await TelegramNotificationService.sendPushPayloadAsTelegramMessage(
        "user_1",
        createPayload(),
        "en",
      );

    expect(report.delivered).toBe(1);
    expect(sentMessage).toContain("CUSTOM 1Password");
  });
});
