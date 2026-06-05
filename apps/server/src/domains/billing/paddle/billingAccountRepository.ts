import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { billingAccountsTable } from "../../../db/schema";

export type BillingAccountRecord = typeof billingAccountsTable.$inferSelect;
export type BillingAccountInsert = typeof billingAccountsTable.$inferInsert;

export class BillingAccountRepository {
  static async findByUserId(
    userId: string,
  ): Promise<BillingAccountRecord | null> {
    const [record] = await db
      .select()
      .from(billingAccountsTable)
      .where(eq(billingAccountsTable.userId, userId));

    return record ?? null;
  }

  static async findByPaddleCustomerId(
    paddleCustomerId: string,
  ): Promise<BillingAccountRecord | null> {
    const [record] = await db
      .select()
      .from(billingAccountsTable)
      .where(eq(billingAccountsTable.paddleCustomerId, paddleCustomerId));

    return record ?? null;
  }

  static async findByPaddleSubscriptionId(
    paddleSubscriptionId: string,
  ): Promise<BillingAccountRecord | null> {
    const [record] = await db
      .select()
      .from(billingAccountsTable)
      .where(
        eq(billingAccountsTable.paddleSubscriptionId, paddleSubscriptionId),
      );

    return record ?? null;
  }

  static async upsertByUserId(payload: {
    userId: string;
    paddleCustomerId?: string | null;
    paddleSubscriptionId?: string | null;
    paddleSubscriptionStatus?: string | null;
    paddlePriceId?: string | null;
    paddleCurrentPeriodEnd?: string | null;
    lastEventOccurredAt?: string | null;
  }): Promise<BillingAccountRecord> {
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

    const [record] = await db
      .insert(billingAccountsTable)
      .values(values)
      .onConflictDoUpdate({
        target: billingAccountsTable.userId,
        set: {
          ...BillingAccountRepository.stripUndefined(values),
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

  static async deleteByUserId(userId: string): Promise<void> {
    await db
      .delete(billingAccountsTable)
      .where(eq(billingAccountsTable.userId, userId));
  }
}
