import { Hono } from "hono";
import { PaddleBillingService } from "../../../domains/billing/paddle/paddleBillingService";
import {
  isPaddleWebhookEvent,
  isValidPaddleOccurredAt,
} from "./paddleWebhookValidators";
import { verifyPaddleSignature } from "./verifyPaddleSignature";

export const paddleWebhookRouter = new Hono<{
  Bindings: { PADDLE_WEBHOOK_SECRET: string };
}>().post("/", async (context) => {
  const signature = context.req.header("paddle-signature");
  const secret = context.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[Paddle Webhook] Missing PADDLE_WEBHOOK_SECRET");
    return context.text("Error: Missing webhook secret", 500);
  }

  const rawBody = await context.req.text();

  const isValidSignature = verifyPaddleSignature({
    payload: rawBody,
    signatureHeader: signature,
    secret,
  });

  if (!isValidSignature) {
    return context.text("Error: Invalid signature", 400);
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return context.text("Error: Invalid JSON", 400);
  }

  if (!isPaddleWebhookEvent(payload)) {
    return context.text("Error: Invalid event payload", 400);
  }

  if (!isValidPaddleOccurredAt(payload.occurred_at)) {
    return context.text("Error: Invalid occurred_at timestamp", 400);
  }

  try {
    await PaddleBillingService.processWebhookEvent(payload);
    return context.json({ received: true }, 200);
  } catch (error) {
    console.error("[Paddle Webhook] Processing failed", {
      eventId: payload.event_id,
      eventType: payload.event_type,
      error,
    });

    return context.text("Error: Processing failed", 500);
  }
});
