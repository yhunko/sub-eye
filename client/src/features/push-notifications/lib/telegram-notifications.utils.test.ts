import { describe, expect, it } from "bun:test";
import {
  TELEGRAM_CONNECT_TIMEOUT_MS,
  isTelegramConnectTimedOut,
} from "./telegram-notifications.utils";

describe("telegram-notifications utils", () => {
  it("detects timeout for Telegram linking flow", () => {
    const now = 1_000_000;
    const withinTimeoutStart = now - (TELEGRAM_CONNECT_TIMEOUT_MS - 1);
    const timedOutStart = now - TELEGRAM_CONNECT_TIMEOUT_MS;

    expect(isTelegramConnectTimedOut(withinTimeoutStart, now)).toBe(false);
    expect(isTelegramConnectTimedOut(timedOutStart, now)).toBe(true);
    expect(isTelegramConnectTimedOut(null, now)).toBe(false);
  });
});
