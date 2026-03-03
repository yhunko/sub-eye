import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { billingAccountsTable } from "../../../db/schema";

export type BillingAccountRecord = typeof billingAccountsTable.$inferSelect;
export type BillingAccountInsert = typeof billingAccountsTable.$inferInsert;

export class BillingAccountRepository {
  static async findByUserId(
    tx: typeof db,
    userId: string,
  ): Promise<BillingAccountRecord | null> {
    const [record] = await tx
      .select()
      .from(billingAccountsTable)
      .where(eq(billingAccountsTable.userId, userId));

    return record ?? null;
  }

  static async findByPaddleCustomerId(
    tx: typeof db,
    paddleCustomerId: string,
  ): Promise<BillingAccountRecord | null> {
    const [record] = await tx
      .select()
      .from(billingAccountsTable)
      .where(eq(billingAccountsTable.paddleCustomerId, paddleCustomerId));

    return record ?? null;
  }

  static async findByPaddleSubscriptionId(
    tx: typeof db,
    paddleSubscriptionId: string,
  ): Promise<BillingAccountRecord | null> {
    const [record] = await tx
      .select()
      .from(billingAccountsTable)
      .where(
        eq(billingAccountsTable.paddleSubscriptionId, paddleSubscriptionId),
      );

    return record ?? null;
  }

  static async upsertByUserId(
    tx: typeof db,
    payload: {
      userId: string;
      paddleCustomerId?: string | null;
      paddleSubscriptionId?: string | null;
      paddleSubscriptionStatus?: string | null;
      paddlePriceId?: string | null;
      paddleCurrentPeriodEnd?: string | null;
      lastEventOccurredAt?: string | null;
    },
  ): Promise<BillingAccountRecord> {
    const now = new Date();
    const values: BillingAccountInsert = {
      userId: payload.userId,
      paddleCustomerId: payload.paddleCustomerId,
      paddleSubscriptionId: payload.paddleSubscriptionId,
      paddleSubscriptionStatus: payload.paddleSubscriptionStatus,
      paddlePriceId: payload.paddlePriceId,
      paddleCurrentPeriodEnd: payload.paddleCurrentPeriodEnd,
      lastEventOccurredAt: payload.lastEventOccurredAt,
      updatedAt: now,
    };

    const [record] = await tx
      .insert(billingAccountsTable)
      .values(values)
      .onConflictDoUpdate({
        target: billingAccountsTable.userId,
        set: {
          ...this.stripUndefined(values),
          updatedAt: now,
        },
      })
      .returning();

    if (!record) {
      throw new Error("Failed to upsert billing account");
    }

    return record;
  }

  private static stripUndefined<T extends Record<string, unknown>>(
    value: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, entryValue]) => entryValue !== undefined,
      ),
    ) as Partial<T>;
  }
}
