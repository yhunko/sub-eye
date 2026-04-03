import { and, count, eq, inArray, isNull } from "drizzle-orm";
import type { db } from "../../db";
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
      .where(
        and(
          eq(subscriptionsTable.userId, userId),
          isNull(subscriptionsTable.orgId),
        ),
      );
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
      .where(
        and(
          eq(subscriptionsTable.userId, userId),
          isNull(subscriptionsTable.orgId),
        ),
      );

    return result?.count ?? 0;
  }

  static async deleteByUserId(
    database: typeof db,
    userId: string,
  ): Promise<void> {
    await database
      .delete(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.userId, userId),
          isNull(subscriptionsTable.orgId),
        ),
      );
  }

  static async deleteMany(database: typeof db, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const deleted = await database
      .delete(subscriptionsTable)
      .where(inArray(subscriptionsTable.id, ids))
      .returning({ id: subscriptionsTable.id });

    return deleted.length;
  }

  static async updateCategoryMany(
    database: typeof db,
    ids: string[],
    categoryId: string | null,
  ): Promise<number> {
    if (ids.length === 0) return 0;

    const updated = await database
      .update(subscriptionsTable)
      .set({ categoryId, updatedAt: new Date() })
      .where(inArray(subscriptionsTable.id, ids))
      .returning({ id: subscriptionsTable.id });

    return updated.length;
  }

  static async findManyByIds(
    database: typeof db,
    ids: string[],
  ): Promise<SubscriptionRecord[]> {
    if (ids.length === 0) return [];

    return database
      .select()
      .from(subscriptionsTable)
      .where(inArray(subscriptionsTable.id, ids));
  }

  static async findByOrgId(
    database: typeof db,
    orgId: string,
  ): Promise<SubscriptionRecord[]> {
    return database
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.orgId, orgId));
  }

  static async countByOrgId(
    database: typeof db,
    orgId: string,
  ): Promise<number> {
    const [result] = await database
      .select({ count: count() })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.orgId, orgId));

    return result?.count ?? 0;
  }

  static async deleteByOrgId(
    database: typeof db,
    orgId: string,
  ): Promise<void> {
    await database
      .delete(subscriptionsTable)
      .where(eq(subscriptionsTable.orgId, orgId));
  }

  static async findByIdForOrg(
    database: typeof db,
    id: string,
    orgId: string,
  ): Promise<SubscriptionRecord | null> {
    const [result] = await database
      .select()
      .from(subscriptionsTable)
      .where(
        and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.orgId, orgId)),
      );

    return result ?? null;
  }
}
