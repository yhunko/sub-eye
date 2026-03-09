import { describe, expect, it } from "bun:test";
import {
  TELEGRAM_LINK_PAYLOAD_PREFIX,
  TELEGRAM_START_PAYLOAD_MAX_LENGTH,
  createTelegramLinkPayload,
  extractTelegramRawToken,
} from "../src/domains/telegram-notification/telegramLinkPayload";

describe("telegram link payload", () => {
  it("creates payload that fits Telegram deep-link max length", () => {
    const payload = createTelegramLinkPayload();

    expect(payload.startsWith(TELEGRAM_LINK_PAYLOAD_PREFIX)).toBe(true);
    expect(payload.length <= TELEGRAM_START_PAYLOAD_MAX_LENGTH).toBe(true);
  });

  it("extracts raw token from valid payload", () => {
    const payload = createTelegramLinkPayload();
    const token = extractTelegramRawToken(payload);

    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(/^[a-f0-9]+$/i.test(token)).toBe(true);
  });

  it("throws on invalid payload", () => {
    expect(() => extractTelegramRawToken("invalid_token")).toThrow(
      "Invalid link payload",
    );
  });
});
