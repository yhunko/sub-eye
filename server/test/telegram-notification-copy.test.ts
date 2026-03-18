import { describe, expect, it } from "bun:test";
import { getTelegramNotificationCopy } from "../src/domains/telegram-notification/telegramNotificationCopy";

describe("getTelegramNotificationCopy", () => {
  it("returns Ukrainian copy for uk locale", () => {
    const copy = getTelegramNotificationCopy("uk-UA");

    expect(copy.testTitle).toBe("Тестове сповіщення");
    expect(copy.openSubEyeButton).toBe("Відкрити SubEye");
  });

  it("falls back to English copy for unknown locale", () => {
    const copy = getTelegramNotificationCopy("de-DE");

    expect(copy.testTitle).toBe("Test Notification");
    expect(copy.openSubEyeButton).toBe("Open SubEye");
  });
});
