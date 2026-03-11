import { eq, count } from "drizzle-orm";
import { db } from "../../db";
import { subscriptionsTable } from "../../db/schema";

export type SubscriptionRecord = typeof subscriptionsTable.$inferSelect;
export type SubscriptionInsert = typeof subscriptionsTable.$inferInsert;

export class SubscriptionRepository {
  static async findByUserId(
    database: typeof db,
    userId: string,
  ): Promise<SubscriptionRecord[]> {
    return database
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId));
  }

  static async findById(
    database: typeof db,
    id: string,
  ): Promise<SubscriptionRecord | null> {
    const [result] = await database
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, id));

    return result ?? null;
  }

  static async create(
    database: typeof db,
    data: SubscriptionInsert,
  ): Promise<SubscriptionRecord> {
    const [subscription] = await database
      .insert(subscriptionsTable)
      .values(data)
      .returning();

    if (!subscription) {
      throw new Error("Failed to create subscription");
    }

    return subscription;
  }

  static async update(
    database: typeof db,
    id: string,
    data: Partial<SubscriptionInsert>,
  ): Promise<SubscriptionRecord> {
    const [updated] = await database
      .update(subscriptionsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update subscription");
    }

    return updated;
  }

  static async delete(database: typeof db, id: string): Promise<void> {
    await database
      .delete(subscriptionsTable)
      .where(eq(subscriptionsTable.id, id));
  }

  static async countByUserId(
    database: typeof db,
    userId: string,
  ): Promise<number> {
    const [result] = await database
      .select({ count: count() })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId));

    return result?.count ?? 0;
  }

  static async deleteByUserId(
    database: typeof db,
    userId: string,
  ): Promise<void> {
    await database
      .delete(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId));
  }
}
