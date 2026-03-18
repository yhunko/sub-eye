import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { telegramWebhookRouter } from "../src/routes/webhooks/telegram";

const app = new Hono().route("/webhooks/telegram", telegramWebhookRouter);

describe("telegram webhook secret verification", () => {
  it("returns 400 when secret token header is missing", async () => {
    const response = await app.request(
      "/webhooks/telegram",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      },
      {
        TELEGRAM_WEBHOOK_SECRET_TOKEN: "secret",
      },
    );

    expect(response.status).toBe(400);
  });

  it("returns 200 when secret token is valid", async () => {
    const response = await app.request(
      "/webhooks/telegram",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "secret",
        },
        body: JSON.stringify({}),
      },
      {
        TELEGRAM_WEBHOOK_SECRET_TOKEN: "secret",
      },
    );

    expect(response.status).toBe(200);
  });
});
