import { describe, expect, it } from "bun:test";
import { parseTelegramWebhookCommand } from "../src/domains/telegram-notification/telegramWebhookCommand";

describe("parseTelegramWebhookCommand", () => {
  it("parses /start command with payload", () => {
    const parsed = parseTelegramWebhookCommand("/start link_abc123");

    expect(parsed.type).toBe("start");
    if (parsed.type === "start") {
      expect(parsed.payload).toBe("link_abc123");
    }
  });

  it("parses /start command without payload", () => {
    const parsed = parseTelegramWebhookCommand("/start");

    expect(parsed.type).toBe("start");
    if (parsed.type === "start") {
      expect(parsed.payload).toBeNull();
    }
  });

  it("parses /stop and /settings commands", () => {
    expect(parseTelegramWebhookCommand("/stop").type).toBe("stop");
    expect(parseTelegramWebhookCommand("/settings").type).toBe("settings");
  });

  it("returns unknown for unsupported command", () => {
    expect(parseTelegramWebhookCommand("/help").type).toBe("unknown");
  });

  it("returns none for plain text", () => {
    expect(parseTelegramWebhookCommand("hello").type).toBe("none");
  });
});
