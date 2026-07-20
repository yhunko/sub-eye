import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../db";
import {
  subscriptionPricePhasesTable,
  subscriptionsTable,
} from "../../db/schema";

export type PricePhaseRecord = typeof subscriptionPricePhasesTable.$inferSelect;
export type PricePhaseInsert = typeof subscriptionPricePhasesTable.$inferInsert;

export class SubscriptionPricePhaseRepository {
  static async findBySubscriptionId(
    subscriptionId: string,
  ): Promise<PricePhaseRecord[]> {
    return db
      .select()
      .from(subscriptionPricePhasesTable)
      .where(eq(subscriptionPricePhasesTable.subscriptionId, subscriptionId))
      .orderBy(asc(subscriptionPricePhasesTable.startsAt));
  }

  static async findBySubscriptionIds(
    ids: string[],
  ): Promise<PricePhaseRecord[]> {
    if (ids.length === 0) return [];

    return db
      .select()
      .from(subscriptionPricePhasesTable)
      .where(inArray(subscriptionPricePhasesTable.subscriptionId, ids))
      .orderBy(asc(subscriptionPricePhasesTable.startsAt));
  }

  static async findById(id: string): Promise<PricePhaseRecord | null> {
    const [result] = await db
      .select()
      .from(subscriptionPricePhasesTable)
      .where(eq(subscriptionPricePhasesTable.id, id));

    return result ?? null;
  }

  static async findPendingBySubscriptionId(
    subscriptionId: string,
  ): Promise<PricePhaseRecord[]> {
    return db
      .select()
      .from(subscriptionPricePhasesTable)
      .where(
        and(
          eq(subscriptionPricePhasesTable.subscriptionId, subscriptionId),
          isNull(subscriptionPricePhasesTable.appliedAt),
        ),
      )
      .orderBy(asc(subscriptionPricePhasesTable.startsAt));
  }

  static async insertMany(
    rows: PricePhaseInsert[],
  ): Promise<PricePhaseRecord[]> {
    if (rows.length === 0) return [];

    return db.insert(subscriptionPricePhasesTable).values(rows).returning();
  }

  static async update(
    id: string,
    data: Partial<PricePhaseInsert>,
  ): Promise<PricePhaseRecord> {
    const [updated] = await db
      .update(subscriptionPricePhasesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptionPricePhasesTable.id, id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update price phase");
    }

    return updated;
  }

  static async deleteById(id: string): Promise<void> {
    await db
      .delete(subscriptionPricePhasesTable)
      .where(eq(subscriptionPricePhasesTable.id, id));
  }

  static async deletePendingBySubscriptionId(
    subscriptionId: string,
  ): Promise<void> {
    await db
      .delete(subscriptionPricePhasesTable)
      .where(
        and(
          eq(subscriptionPricePhasesTable.subscriptionId, subscriptionId),
          isNull(subscriptionPricePhasesTable.appliedAt),
        ),
      );
  }

  static async deleteAllBySubscriptionId(
    subscriptionId: string,
  ): Promise<void> {
    await db
      .delete(subscriptionPricePhasesTable)
      .where(eq(subscriptionPricePhasesTable.subscriptionId, subscriptionId));
  }

  /**
   * Atomically apply a phase boundary: copy the phase price onto the
   * subscription row and stamp the phase as applied. `neon-http` has no
   * interactive transactions, so this is the one place `db.batch` is used to
   * keep the two writes together.
   */
  static async applyBoundaryBatch(args: {
    subscriptionId: string;
    cost: string;
    currency: string;
    phaseId: string;
    appliedAt: string;
  }): Promise<void> {
    await db.batch([
      db
        .update(subscriptionsTable)
        .set({
          cost: args.cost,
          currency: args.currency,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionsTable.id, args.subscriptionId)),
      db
        .update(subscriptionPricePhasesTable)
        .set({
          appliedAt: args.appliedAt,
          qstashMessageId: null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPricePhasesTable.id, args.phaseId)),
    ]);
  }
}
