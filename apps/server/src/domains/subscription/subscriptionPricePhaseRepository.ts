import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  subscriptionPricePhasesTable,
  subscriptionsTable,
} from "../../db/schema";

export type PricePhaseRecord = typeof subscriptionPricePhasesTable.$inferSelect;
export type PricePhaseInsert = typeof subscriptionPricePhasesTable.$inferInsert;

export class SubscriptionPricePhaseRepository {
  static async findByUserId(userId: string): Promise<PricePhaseRecord[]> {
    return db
      .select()
      .from(subscriptionPricePhasesTable)
      .where(eq(subscriptionPricePhasesTable.userId, userId))
      .orderBy(asc(subscriptionPricePhasesTable.startsAt));
  }

  static async findBySubscriptionId(
    subscriptionId: string,
    userId: string,
  ): Promise<PricePhaseRecord[]> {
    return db
      .select()
      .from(subscriptionPricePhasesTable)
      .where(
        and(
          eq(subscriptionPricePhasesTable.subscriptionId, subscriptionId),
          eq(subscriptionPricePhasesTable.userId, userId),
        ),
      )
      .orderBy(asc(subscriptionPricePhasesTable.startsAt));
  }

  static async findBySubscriptionIds(
    ids: string[],
    userId: string,
  ): Promise<PricePhaseRecord[]> {
    if (ids.length === 0) return [];

    return db
      .select()
      .from(subscriptionPricePhasesTable)
      .where(
        and(
          inArray(subscriptionPricePhasesTable.subscriptionId, ids),
          eq(subscriptionPricePhasesTable.userId, userId),
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

  static async deleteMany(ids: string[], userId: string): Promise<void> {
    if (ids.length === 0) return;

    await db
      .delete(subscriptionPricePhasesTable)
      .where(
        and(
          inArray(subscriptionPricePhasesTable.id, ids),
          eq(subscriptionPricePhasesTable.userId, userId),
        ),
      );
  }

  static async deleteById(id: string, userId: string): Promise<void> {
    await db
      .delete(subscriptionPricePhasesTable)
      .where(
        and(
          eq(subscriptionPricePhasesTable.id, id),
          eq(subscriptionPricePhasesTable.userId, userId),
        ),
      );
  }

  /**
   * Atomically apply a phase boundary:
   *  1. copy the phase price onto the subscription row,
   *  2. stamp the phase applied AND move its `startsAt` to the apply moment,
   *  3. close the phase it displaces at that same moment.
   *
   * Steps 2 and 3 are what keep `getEffectivePhase` / `getUpcomingPhase`
   * honest after an early "apply now". `neon-http` has no interactive
   * transactions, so this is the one place `db.batch` is used.
   */
  static async applyBoundaryBatch(args: {
    subscriptionId: string;
    userId: string;
    cost: string;
    currency: string;
    phaseId: string;
    appliedAt: string;
    startsAt: string;
    precedingPhaseId: string | null;
  }): Promise<void> {
    const statements = [
      db
        .update(subscriptionsTable)
        .set({
          cost: args.cost,
          currency: args.currency,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(subscriptionsTable.id, args.subscriptionId),
            eq(subscriptionsTable.userId, args.userId),
          ),
        ),
      db
        .update(subscriptionPricePhasesTable)
        .set({
          appliedAt: args.appliedAt,
          startsAt: args.startsAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(subscriptionPricePhasesTable.id, args.phaseId),
            eq(subscriptionPricePhasesTable.userId, args.userId),
          ),
        ),
    ];

    if (args.precedingPhaseId) {
      statements.push(
        db
          .update(subscriptionPricePhasesTable)
          .set({ endsAt: args.appliedAt, updatedAt: new Date() })
          .where(
            and(
              eq(subscriptionPricePhasesTable.id, args.precedingPhaseId),
              eq(subscriptionPricePhasesTable.userId, args.userId),
            ),
          ),
      );
    }

    await db.batch(
      statements as [(typeof statements)[number], ...typeof statements],
    );
  }
}
