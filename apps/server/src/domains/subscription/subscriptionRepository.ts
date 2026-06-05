import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../db";
import { subscriptionsTable } from "../../db/schema";

export type SubscriptionRecord = typeof subscriptionsTable.$inferSelect;
export type SubscriptionInsert = typeof subscriptionsTable.$inferInsert;

export class SubscriptionRepository {
  static async findByUserId(userId: string): Promise<SubscriptionRecord[]> {
    return db
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.userId, userId),
          isNull(subscriptionsTable.orgId),
        ),
      );
  }

  static async findById(id: string): Promise<SubscriptionRecord | null> {
    const [result] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, id));

    return result ?? null;
  }

  static async create(data: SubscriptionInsert): Promise<SubscriptionRecord> {
    const [subscription] = await db
      .insert(subscriptionsTable)
      .values(data)
      .returning();

    if (!subscription) {
      throw new Error("Failed to create subscription");
    }

    return subscription;
  }

  static async update(
    id: string,
    data: Partial<SubscriptionInsert>,
  ): Promise<SubscriptionRecord> {
    const [updated] = await db
      .update(subscriptionsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update subscription");
    }

    return updated;
  }

  static async delete(id: string): Promise<void> {
    await db.delete(subscriptionsTable).where(eq(subscriptionsTable.id, id));
  }

  static async countByUserId(userId: string): Promise<number> {
    const [result] = await db
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

  static async deleteByUserId(userId: string): Promise<void> {
    await db
      .delete(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.userId, userId),
          isNull(subscriptionsTable.orgId),
        ),
      );
  }

  static async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const deleted = await db
      .delete(subscriptionsTable)
      .where(inArray(subscriptionsTable.id, ids))
      .returning({ id: subscriptionsTable.id });

    return deleted.length;
  }

  static async updateCategoryMany(
    ids: string[],
    categoryId: string | null,
  ): Promise<number> {
    if (ids.length === 0) return 0;

    const updated = await db
      .update(subscriptionsTable)
      .set({ categoryId, updatedAt: new Date() })
      .where(inArray(subscriptionsTable.id, ids))
      .returning({ id: subscriptionsTable.id });

    return updated.length;
  }

  static async findManyByIds(ids: string[]): Promise<SubscriptionRecord[]> {
    if (ids.length === 0) return [];

    return db
      .select()
      .from(subscriptionsTable)
      .where(inArray(subscriptionsTable.id, ids));
  }

  static async findByOrgId(orgId: string): Promise<SubscriptionRecord[]> {
    return db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.orgId, orgId));
  }

  static async countByOrgId(orgId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.orgId, orgId));

    return result?.count ?? 0;
  }

  static async deleteByOrgId(orgId: string): Promise<void> {
    await db
      .delete(subscriptionsTable)
      .where(eq(subscriptionsTable.orgId, orgId));
  }

  static async findByIdForOrg(
    id: string,
    orgId: string,
  ): Promise<SubscriptionRecord | null> {
    const [result] = await db
      .select()
      .from(subscriptionsTable)
      .where(
        and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.orgId, orgId)),
      );

    return result ?? null;
  }
}
