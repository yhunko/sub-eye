import { eq } from "drizzle-orm";
import { db } from "../../db";
import { fxRatesTable } from "../../db/schema";

export type FxRateRecord = {
  rates: Record<string, number>;
  rateDate: string;
};

export class FxRateRepository {
  static async findByBase(base: string): Promise<FxRateRecord | null> {
    const [result] = await db
      .select({
        rates: fxRatesTable.rates,
        rateDate: fxRatesTable.rateDate,
      })
      .from(fxRatesTable)
      .where(eq(fxRatesTable.base, base.toLowerCase()));

    return result ?? null;
  }

  static async upsert(
    base: string,
    rates: Record<string, number>,
    rateDate: string,
  ): Promise<void> {
    await db
      .insert(fxRatesTable)
      .values({ base: base.toLowerCase(), rates, rateDate })
      .onConflictDoUpdate({
        target: fxRatesTable.base,
        set: { rates, rateDate, fetchedAt: new Date().toISOString() },
      });
  }
}
