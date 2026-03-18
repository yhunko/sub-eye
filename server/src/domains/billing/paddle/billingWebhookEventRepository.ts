import { db } from "../../../db";
import { billingWebhookEventsTable } from "../../../db/schema";

export class BillingWebhookEventRepository {
  static async markProcessed(
    database: typeof db,
    payload: {
      eventId: string;
      eventType: string;
      occurredAt: string;
      eventPayload: unknown;
    },
  ): Promise<boolean> {
    const occurredAt = new Date(payload.occurredAt);

    if (Number.isNaN(occurredAt.getTime())) {
      throw new Error("Invalid Paddle webhook occurredAt timestamp");
    }

    const [result] = await database
      .insert(billingWebhookEventsTable)
      .values({
        eventId: payload.eventId,
        eventType: payload.eventType,
        occurredAt: occurredAt.toISOString(),
        payload: payload.eventPayload,
      })
      .onConflictDoNothing({ target: billingWebhookEventsTable.eventId })
      .returning({ eventId: billingWebhookEventsTable.eventId });

    return Boolean(result?.eventId);
  }
}
