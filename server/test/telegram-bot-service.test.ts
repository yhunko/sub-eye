import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { TelegramBotService } from "../src/domains/telegram-notification/telegramBotService";

const originalBaseUrl = process.env.BASE_URL;
const originalTelegramPublicBaseUrl = process.env.TELEGRAM_PUBLIC_BASE_URL;
const originalBotUsername = process.env.TELEGRAM_BOT_USERNAME;
const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;
const originalFetch = globalThis.fetch;

describe("TelegramBotService static methods", () => {
  beforeEach(() => {
    delete process.env.BASE_URL;
    delete process.env.TELEGRAM_PUBLIC_BASE_URL;
    delete process.env.TELEGRAM_BOT_USERNAME;
    delete process.env.TELEGRAM_BOT_TOKEN;
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    process.env.BASE_URL = originalBaseUrl;
    process.env.TELEGRAM_PUBLIC_BASE_URL = originalTelegramPublicBaseUrl;
    process.env.TELEGRAM_BOT_USERNAME = originalBotUsername;
    process.env.TELEGRAM_BOT_TOKEN = originalBotToken;
    globalThis.fetch = originalFetch;
  });

  it("supports unbound getSettingsUrl call", () => {
    process.env.BASE_URL = "https://app.subeye.cc";

    const getSettingsUrl = TelegramBotService.getSettingsUrl;
    expect(getSettingsUrl()).toBe(
      "https://app.subeye.cc/settings/notifications",
    );
  });

  it("supports unbound buildDeepLink call", () => {
    process.env.TELEGRAM_BOT_USERNAME = "subeye_bot";

    const buildDeepLink = TelegramBotService.buildDeepLink;
    expect(buildDeepLink("link_payload")).toBe(
      "https://t.me/subeye_bot?start=link_payload",
    );
  });

  it("supports unbound sendMessage call when token is configured", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "token";

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const sendMessage = TelegramBotService.sendMessage;
    const result = await sendMessage("chat-1", "hello", {
      buttons: [{ text: "Open", url: "https://app.subeye.cc/settings" }],
    });

    expect(result).toEqual({ ok: true });
  });
});
