import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { subscriptionHistoryTable } from "../../db/schema";

export type SubscriptionHistoryInsert =
  typeof subscriptionHistoryTable.$inferInsert;
export type SubscriptionHistoryRecord =
  typeof subscriptionHistoryTable.$inferSelect;

export class SubscriptionHistoryRepository {
  static async insert(
    database: typeof db,
    payload: SubscriptionHistoryInsert,
  ): Promise<SubscriptionHistoryRecord> {
    const [record] = await database
      .insert(subscriptionHistoryTable)
      .values(payload)
      .returning();

    if (!record) {
      throw new Error("Failed to create subscription history");
    }

    return record;
  }

  static async findBySubscriptionId(
    database: typeof db,
    {
      subscriptionId,
      userId,
    }: {
      subscriptionId: string;
      userId: string;
    },
    limit?: number,
  ): Promise<SubscriptionHistoryRecord[]> {
    const query = database
      .select()
      .from(subscriptionHistoryTable)
      .where(
        and(
          eq(subscriptionHistoryTable.subscriptionId, subscriptionId),
          eq(subscriptionHistoryTable.userId, userId),
        ),
      )
      .orderBy(desc(subscriptionHistoryTable.createdAt));

    if (limit === undefined) {
      return query;
    }

    return query.limit(limit);
  }

  static async deleteById(
    database: typeof db,
    {
      historyId,
      subscriptionId,
      userId,
    }: {
      historyId: string;
      subscriptionId: string;
      userId: string;
    },
  ): Promise<boolean> {
    const deleted = await database
      .delete(subscriptionHistoryTable)
      .where(
        and(
          eq(subscriptionHistoryTable.id, historyId),
          eq(subscriptionHistoryTable.subscriptionId, subscriptionId),
          eq(subscriptionHistoryTable.userId, userId),
        ),
      )
      .returning({ id: subscriptionHistoryTable.id });

    return deleted.length > 0;
  }

  static async deleteBySubscriptionId(
    database: typeof db,
    subscriptionId: string,
  ): Promise<void> {
    await database
      .delete(subscriptionHistoryTable)
      .where(eq(subscriptionHistoryTable.subscriptionId, subscriptionId));
  }
}
