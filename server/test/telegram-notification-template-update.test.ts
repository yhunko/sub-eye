import { afterEach, describe, expect, it } from "bun:test";
import type { TelegramNotificationStatus } from "shared";
import { TelegramNotificationRepository } from "../src/domains/telegram-notification/telegramNotificationRepository";
import {
  TELEGRAM_TEMPLATE_NOT_LINKED_ERROR,
  TELEGRAM_TEMPLATE_PLUS_REQUIRED_ERROR,
  TelegramNotificationService,
} from "../src/domains/telegram-notification/telegramNotificationService";
import { UserService } from "../src/domains/user/userService";

const originalGetPlanId = UserService.getPlanId;
const originalUpdateMessageTemplateByUserId =
  TelegramNotificationRepository.updateMessageTemplateByUserId;
const originalGetStatus = TelegramNotificationService.getStatus;

const statusFixture: TelegramNotificationStatus = {
  linked: true,
  enabled: true,
  botUsername: "subeye_bot",
  accountLabel: "@su***ot",
  messageTemplate: {
    version: 1,
    template: "{subscription_name}",
  },
  defaultMessageTemplate: {
    version: 1,
    template: "{subscription_name}",
  },
  isCustomTemplate: true,
};

afterEach(() => {
  (
    UserService as unknown as {
      getPlanId: typeof UserService.getPlanId;
    }
  ).getPlanId = originalGetPlanId;

  (
    TelegramNotificationRepository as unknown as {
      updateMessageTemplateByUserId: typeof TelegramNotificationRepository.updateMessageTemplateByUserId;
    }
  ).updateMessageTemplateByUserId = originalUpdateMessageTemplateByUserId;

  (
    TelegramNotificationService as unknown as {
      getStatus: typeof TelegramNotificationService.getStatus;
    }
  ).getStatus = originalGetStatus;
});

describe("TelegramNotificationService.updateMessageTemplate", () => {
  it("rejects updates for free plan users", async () => {
    (
      UserService as unknown as {
        getPlanId: typeof UserService.getPlanId;
      }
    ).getPlanId = async () => "free";

    await expect(
      TelegramNotificationService.updateMessageTemplate("user_1", {
        version: 1,
        template: "{subscription_name}",
      }),
    ).rejects.toThrow(TELEGRAM_TEMPLATE_PLUS_REQUIRED_ERROR);
  });

  it("rejects unknown variables", async () => {
    (
      UserService as unknown as {
        getPlanId: typeof UserService.getPlanId;
      }
    ).getPlanId = async () => "plus";

    await expect(
      TelegramNotificationService.updateMessageTemplate("user_1", {
        version: 1,
        template: "{subscription_name} {unsupported_variable}",
      }),
    ).rejects.toThrow("Unsupported template variables:");
  });

  it("fails when telegram link is missing", async () => {
    (
      UserService as unknown as {
        getPlanId: typeof UserService.getPlanId;
      }
    ).getPlanId = async () => "plus";

    (
      TelegramNotificationRepository as unknown as {
        updateMessageTemplateByUserId: typeof TelegramNotificationRepository.updateMessageTemplateByUserId;
      }
    ).updateMessageTemplateByUserId = async () => null;

    await expect(
      TelegramNotificationService.updateMessageTemplate("user_1", {
        version: 1,
        template: "{subscription_name}",
      }),
    ).rejects.toThrow(TELEGRAM_TEMPLATE_NOT_LINKED_ERROR);
  });

  it("updates template for plus users", async () => {
    (
      UserService as unknown as {
        getPlanId: typeof UserService.getPlanId;
      }
    ).getPlanId = async () => "plus";

    (
      TelegramNotificationRepository as unknown as {
        updateMessageTemplateByUserId: typeof TelegramNotificationRepository.updateMessageTemplateByUserId;
      }
    ).updateMessageTemplateByUserId = async () =>
      ({ id: 1, userId: "user_1" }) as never;

    (
      TelegramNotificationService as unknown as {
        getStatus: typeof TelegramNotificationService.getStatus;
      }
    ).getStatus = async () => statusFixture;

    const result = await TelegramNotificationService.updateMessageTemplate(
      "user_1",
      {
        version: 1,
        template: "{subscription_name}",
      },
    );

    expect(result).toEqual(statusFixture);
  });
});
