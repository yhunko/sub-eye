import { describe, expect, it } from "bun:test";
import {
  TELEGRAM_CONNECT_TIMEOUT_MS,
  getTelegramBotUrl,
  isTelegramConnectTimedOut,
} from "../src/features/push-notifications/lib/telegram-notifications.utils";

describe("telegram-notifications utils", () => {
  it("normalizes bot usernames to Telegram URL", () => {
    expect(getTelegramBotUrl("@subeye_dev_bot")).toBe(
      "https://t.me/subeye_dev_bot",
    );
    expect(getTelegramBotUrl("subeye_prod_bot")).toBe(
      "https://t.me/subeye_prod_bot",
    );
  });

  it("returns null when bot username is absent", () => {
    expect(getTelegramBotUrl("")).toBeNull();
    expect(getTelegramBotUrl(null)).toBeNull();
    expect(getTelegramBotUrl(undefined)).toBeNull();
  });

  it("detects timeout for Telegram linking flow", () => {
    const now = 1_000_000;
    const withinTimeoutStart = now - (TELEGRAM_CONNECT_TIMEOUT_MS - 1);
    const timedOutStart = now - TELEGRAM_CONNECT_TIMEOUT_MS;

    expect(isTelegramConnectTimedOut(withinTimeoutStart, now)).toBe(false);
    expect(isTelegramConnectTimedOut(timedOutStart, now)).toBe(true);
    expect(isTelegramConnectTimedOut(null, now)).toBe(false);
  });
});
