import { eq } from "drizzle-orm";
import { db } from "../../../db";
import { orgBillingAccountsTable } from "../../../db/schema";

export type OrgBillingAccountRecord =
  typeof orgBillingAccountsTable.$inferSelect;
export type OrgBillingAccountInsert =
  typeof orgBillingAccountsTable.$inferInsert;

export class OrgBillingAccountRepository {
  static async findByOrgId(
    database: typeof db,
    orgId: string,
  ): Promise<OrgBillingAccountRecord | null> {
    const [record] = await database
      .select()
      .from(orgBillingAccountsTable)
      .where(eq(orgBillingAccountsTable.orgId, orgId));

    return record ?? null;
  }

  static async findByPaddleCustomerId(
    database: typeof db,
    paddleCustomerId: string,
  ): Promise<OrgBillingAccountRecord | null> {
    const [record] = await database
      .select()
      .from(orgBillingAccountsTable)
      .where(eq(orgBillingAccountsTable.paddleCustomerId, paddleCustomerId));

    return record ?? null;
  }

  static async findByPaddleSubscriptionId(
    database: typeof db,
    paddleSubscriptionId: string,
  ): Promise<OrgBillingAccountRecord | null> {
    const [record] = await database
      .select()
      .from(orgBillingAccountsTable)
      .where(
        eq(orgBillingAccountsTable.paddleSubscriptionId, paddleSubscriptionId),
      );

    return record ?? null;
  }

  static async upsertByOrgId(
    database: typeof db,
    payload: {
      orgId: string;
      adminUserId: string;
      paddleCustomerId?: string | null;
      paddleSubscriptionId?: string | null;
      paddleSubscriptionStatus?: string | null;
      paddlePriceId?: string | null;
      paddleCurrentPeriodEnd?: string | null;
      lastEventOccurredAt?: string | null;
    },
  ): Promise<OrgBillingAccountRecord> {
    const now = new Date();
    const values: OrgBillingAccountInsert = {
      orgId: payload.orgId,
      adminUserId: payload.adminUserId,
      paddleCustomerId: payload.paddleCustomerId,
      paddleSubscriptionId: payload.paddleSubscriptionId,
      paddleSubscriptionStatus: payload.paddleSubscriptionStatus,
      paddlePriceId: payload.paddlePriceId,
      paddleCurrentPeriodEnd: payload.paddleCurrentPeriodEnd,
      lastEventOccurredAt: payload.lastEventOccurredAt,
      updatedAt: now,
    };

    const [record] = await database
      .insert(orgBillingAccountsTable)
      .values(values)
      .onConflictDoUpdate({
        target: orgBillingAccountsTable.orgId,
        set: {
          ...this.stripUndefined(values),
          updatedAt: now,
        },
      })
      .returning();

    if (!record) {
      throw new Error("Failed to upsert org billing account");
    }

    return record;
  }

  static async deleteByOrgId(
    database: typeof db,
    orgId: string,
  ): Promise<void> {
    await database
      .delete(orgBillingAccountsTable)
      .where(eq(orgBillingAccountsTable.orgId, orgId));
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
