import { Hono } from "hono";
import {
  TelegramWebhookService,
  type TelegramUpdate,
} from "../../../domains/telegram-notification/telegramWebhookService";

export const telegramWebhookRouter = new Hono<{
  Bindings: { TELEGRAM_WEBHOOK_SECRET_TOKEN: string };
}>().post("/", async (context) => {
  const expectedSecret = context.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
  const providedSecret = context.req.header("x-telegram-bot-api-secret-token");

  if (!expectedSecret) {
    console.error(
      "[Telegram Webhook] Missing TELEGRAM_WEBHOOK_SECRET_TOKEN configuration",
    );
    return context.text("Error: Missing webhook secret", 500);
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    return context.text("Error: Invalid webhook secret token", 400);
  }

  let payload: TelegramUpdate;

  try {
    payload = (await context.req.json()) as TelegramUpdate;
  } catch {
    return context.text("Error: Invalid JSON", 400);
  }

  try {
    await TelegramWebhookService.processUpdate(payload);
  } catch (error) {
    console.error("[Telegram Webhook] Processing failed", { error });
    return context.text("Error: Processing failed", 500);
  }

  return context.json({ received: true }, 200);
});
