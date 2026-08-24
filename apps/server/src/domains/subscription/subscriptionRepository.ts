import type { SubscriptionStatus } from "@subeye/model";
import { and, asc, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { subscriptionsTable } from "../../db/schema";

export type SubscriptionRecord = typeof subscriptionsTable.$inferSelect;
export type SubscriptionInsert = typeof subscriptionsTable.$inferInsert;

export class SubscriptionRepository {
  static async findByUserId(userId: string): Promise<SubscriptionRecord[]> {
    return db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId));
  }

  /**
   * One SQL query does search + status + category + sort + pagination.
   *
   * ponytail: offset cursor, not a keyset, and the cost sort uses a
   * period-normalized NATIVE amount (no FX join). Ordering is therefore exact
   * within a page and approximate across pages; the service re-sorts each page
   * with the converted amounts. Move to a keyset + an fx_rates join if a user
   * ever has enough rows for deep paging to matter.
   *
   * The "active" filter includes `cancelling` rows (still billing until the
   * period ends), preserving the pre-v4 in-memory filter's behaviour.
   */
  static async findPageByUserId(args: {
    userId: string;
    search?: string;
    status?: SubscriptionStatus | "all";
    categoryId?: string;
    sortBy: "nextPaymentDate" | "name" | "cost";
    direction: "asc" | "desc";
    cursor?: string;
    limit: number;
  }): Promise<{ rows: SubscriptionRecord[]; nextCursor: string | null }> {
    const filters = [eq(subscriptionsTable.userId, args.userId)];

    if (args.status === "active") {
      filters.push(
        inArray(subscriptionsTable.status, ["active", "cancelling"]),
      );
    } else if (args.status && args.status !== "all") {
      filters.push(eq(subscriptionsTable.status, args.status));
    }
    if (args.categoryId) {
      filters.push(eq(subscriptionsTable.categoryId, args.categoryId));
    }
    if (args.search) {
      filters.push(ilike(subscriptionsTable.name, `%${args.search}%`));
    }

    // cost normalized to a monthly figure in its OWN currency.
    const monthlyNative = sql`(${subscriptionsTable.cost}::numeric * 30.44) / (${subscriptionsTable.every} * CASE ${subscriptionsTable.period}
      WHEN 'day' THEN 1
      WHEN 'week' THEN 7
      WHEN 'month' THEN 30.44
      ELSE 365.25 END)`;

    const column =
      args.sortBy === "name"
        ? subscriptionsTable.name
        : args.sortBy === "cost"
          ? monthlyNative
          : subscriptionsTable.paymentDate;

    const offset = Number(args.cursor ?? "0");
    const safeOffset = Number.isFinite(offset) && offset > 0 ? offset : 0;

    const rows = await db
      .select()
      .from(subscriptionsTable)
      .where(and(...filters))
      .orderBy(args.direction === "desc" ? desc(column) : asc(column))
      .limit(args.limit + 1)
      .offset(safeOffset);

    const hasMore = rows.length > args.limit;
    return {
      rows: hasMore ? rows.slice(0, args.limit) : rows,
      nextCursor: hasMore ? String(safeOffset + args.limit) : null,
    };
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
      .where(eq(subscriptionsTable.userId, userId));

    return result?.count ?? 0;
  }

  static async deleteByUserId(userId: string): Promise<void> {
    await db
      .delete(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId));
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
}
