import { describe, expect, it } from "bun:test";
import { isValidPaddleOccurredAt } from "../src/routes/webhooks/paddle/paddleWebhookValidators";

describe("isValidPaddleOccurredAt", () => {
  it("accepts valid ISO timestamps", () => {
    expect(isValidPaddleOccurredAt("2026-03-03T09:00:00.000Z")).toBe(true);
  });

  it("rejects invalid timestamps", () => {
    expect(isValidPaddleOccurredAt("invalid-date")).toBe(false);
    expect(isValidPaddleOccurredAt("2026-13-99")).toBe(false);
  });
});
