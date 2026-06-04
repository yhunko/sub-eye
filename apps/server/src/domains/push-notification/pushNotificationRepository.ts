import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { pushNotificationsTable } from "../../db/schema";

export type PushSubscriptionRecord = typeof pushNotificationsTable.$inferSelect;
export type NewPushSubscriptionRecord =
  typeof pushNotificationsTable.$inferInsert;

export class PushNotificationRepository {
  static async create(
    data: NewPushSubscriptionRecord,
  ): Promise<PushSubscriptionRecord> {
    const [record] = await db
      .insert(pushNotificationsTable)
      .values(data)
      .onConflictDoUpdate({
        target: [
          pushNotificationsTable.userId,
          pushNotificationsTable.endpoint,
        ],
        set: {
          p256dh: data.p256dh,
          auth: data.auth,
          createdAt: new Date(),
        },
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create push subscription");
    }

    return record;
  }

  static async findByUserId(userId: string): Promise<PushSubscriptionRecord[]> {
    return db
      .select()
      .from(pushNotificationsTable)
      .where(eq(pushNotificationsTable.userId, userId));
  }

  static async deleteByUserId(userId: string): Promise<void> {
    await db
      .delete(pushNotificationsTable)
      .where(eq(pushNotificationsTable.userId, userId));
  }

  static async deleteByEndpoint(endpoint: string): Promise<void> {
    await db
      .delete(pushNotificationsTable)
      .where(eq(pushNotificationsTable.endpoint, endpoint));
  }

  static async deleteByUserAndEndpoint(
    userId: string,
    endpoint: string,
  ): Promise<void> {
    await db
      .delete(pushNotificationsTable)
      .where(
        and(
          eq(pushNotificationsTable.userId, userId),
          eq(pushNotificationsTable.endpoint, endpoint),
        ),
      );
  }
}
