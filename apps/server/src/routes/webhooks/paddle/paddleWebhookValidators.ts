import type { PaddleWebhookEvent } from "../../../domains/billing/paddle/paddleTypes";

export const isPaddleWebhookEvent = (
  value: unknown,
): value is PaddleWebhookEvent => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Record<string, unknown>;

  return (
    typeof event.event_id === "string" &&
    typeof event.event_type === "string" &&
    typeof event.occurred_at === "string" &&
    event.data !== null &&
    typeof event.data === "object" &&
    !Array.isArray(event.data)
  );
};

export const isValidPaddleOccurredAt = (value: string): boolean =>
  !Number.isNaN(Date.parse(value));
