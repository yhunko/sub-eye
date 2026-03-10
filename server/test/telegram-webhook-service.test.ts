import { describe, expect, it } from "bun:test";
import { parseTelegramWebhookCommand } from "../src/domains/telegram-notification/telegramWebhookCommand";
import {
  TelegramWebhookService,
  type TelegramUpdate,
} from "../src/domains/telegram-notification/telegramWebhookService";

type TelegramWebhookDeps = NonNullable<
  Parameters<typeof TelegramWebhookService.processUpdate>[1]
>;

const createDeps = (
  overrides: Partial<TelegramWebhookDeps> = {},
): TelegramWebhookDeps => ({
  getSettingsUrl: () => "https://app.subeye.cc/settings/notifications",
  parseCommand: parseTelegramWebhookCommand,
  sendMessage: async () => ({ ok: true }),
  getLinkedUserIdByChatId: async () => null,
  getUserLocale: async () => "en",
  disconnectByChatId: async () => false,
  linkFromStartPayload: async () => ({ userId: "user_01" }),
  sendTestNotification: async () => ({
    attempted: 1,
    delivered: 1,
    failed: 0,
    skipped: 0,
  }),
  ...overrides,
});

describe("TelegramWebhookService.processUpdate", () => {
  it("asks users to continue in private chat for non-private conversations", async () => {
    const sentMessages: string[] = [];

    await TelegramWebhookService.processUpdate(
      {
        message: {
          text: "/start",
          chat: { id: 1, type: "group" },
        },
      },
      createDeps({
        sendMessage: async (_chatId, text) => {
          sentMessages.push(text);
          return { ok: true };
        },
      }),
    );

    expect(sentMessages).toEqual([
      "Please message me in a private chat to connect your SubEye account.",
    ]);
  });

  it("links account for /start link payload and sends confirmation flow", async () => {
    let linkedPayload: TelegramUpdate["message"] | null = null;
    let sentTestToUserId: string | null = null;
    const sentMessages: string[] = [];

    await TelegramWebhookService.processUpdate(
      {
        message: {
          text: "/start link_abcdef0123456789",
          chat: { id: 42, type: "private" },
          from: { id: 7, username: "demo_user" },
        },
      },
      createDeps({
        linkFromStartPayload: async (input) => {
          linkedPayload = {
            text: input.payload,
            chat: { id: Number(input.chatId), type: "private" },
            from: {
              id: Number(input.telegramUserId),
              username: input.telegramUsername ?? undefined,
            },
          };
          return { userId: "user_99" };
        },
        sendMessage: async (_chatId, text) => {
          sentMessages.push(text);
          return { ok: true };
        },
        sendTestNotification: async (userId) => {
          sentTestToUserId = userId;
          return {
            attempted: 1,
            delivered: 1,
            failed: 0,
            skipped: 0,
          };
        },
      }),
    );

    expect(linkedPayload).toEqual({
      text: "link_abcdef0123456789",
      chat: { id: 42, type: "private" },
      from: { id: 7, username: "demo_user" },
    });
    expect(sentMessages).toContain(
      "SubEye is now connected to this Telegram chat. Notifications are enabled.",
    );
    expect(sentTestToUserId).toBe("user_99");
  });

  it("handles /stop command and confirms when no linked account exists", async () => {
    const sentMessages: string[] = [];

    await TelegramWebhookService.processUpdate(
      {
        message: {
          text: "/stop",
          chat: { id: 7, type: "private" },
        },
      },
      createDeps({
        disconnectByChatId: async () => false,
        sendMessage: async (_chatId, text) => {
          sentMessages.push(text);
          return { ok: true };
        },
      }),
    );

    expect(sentMessages).toEqual([
      "No linked SubEye account found for this chat.",
    ]);
  });

  it("localizes webhook replies when linked user locale is Ukrainian", async () => {
    const sentMessages: string[] = [];

    await TelegramWebhookService.processUpdate(
      {
        message: {
          text: "/settings",
          chat: { id: 15, type: "private" },
        },
      },
      createDeps({
        getLinkedUserIdByChatId: async () => "user_uk",
        getUserLocale: async () => "uk",
        sendMessage: async (_chatId, text) => {
          sentMessages.push(text);
          return { ok: true };
        },
      }),
    );

    expect(sentMessages).toEqual(["Відкрийте налаштування сповіщень SubEye:"]);
  });

  it("treats already-consumed /start token as success when chat is linked", async () => {
    const sentMessages: string[] = [];
    let sentTestToUserId: string | null = null;

    await TelegramWebhookService.processUpdate(
      {
        message: {
          text: "/start link_abcdef0123456789",
          chat: { id: 777, type: "private" },
          from: { id: 7, username: "demo_user" },
        },
      },
      createDeps({
        linkFromStartPayload: async () => {
          throw new Error("Link token is invalid or expired");
        },
        getLinkedUserIdByChatId: async () => "user_99",
        sendMessage: async (_chatId, text) => {
          sentMessages.push(text);
          return { ok: true };
        },
        sendTestNotification: async (userId) => {
          sentTestToUserId = userId;
          return {
            attempted: 1,
            delivered: 1,
            failed: 0,
            skipped: 0,
          };
        },
      }),
    );

    expect(sentMessages).toContain(
      "SubEye is now connected to this Telegram chat. Notifications are enabled.",
    );
    expect(sentMessages).not.toContain(
      "Could not connect account. Please try again from SubEye settings.",
    );
    expect(sentTestToUserId).toBe("user_99");
  });

  it("does not report connect failure when post-link test send throws", async () => {
    const sentMessages: string[] = [];

    await TelegramWebhookService.processUpdate(
      {
        message: {
          text: "/start link_abcdef0123456789",
          chat: { id: 42, type: "private" },
          from: { id: 7, username: "demo_user" },
        },
      },
      createDeps({
        sendMessage: async (_chatId, text) => {
          sentMessages.push(text);
          return { ok: true };
        },
        sendTestNotification: async () => {
          throw new Error("temporary downstream issue");
        },
      }),
    );

    expect(sentMessages).toContain(
      "SubEye is now connected to this Telegram chat. Notifications are enabled.",
    );
    expect(sentMessages).not.toContain(
      "Could not connect account. Please try again from SubEye settings.",
    );
  });
});
