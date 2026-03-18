import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  comparatorAiCacheTable,
  comparatorAiUsageTable,
  comparatorUsageTable,
} from "../../db/schema";

export type ComparatorUsageRecord = typeof comparatorUsageTable.$inferSelect;
export type ComparatorAiUsageRecord =
  typeof comparatorAiUsageTable.$inferSelect;
export type ComparatorAiCacheRecord =
  typeof comparatorAiCacheTable.$inferSelect;

export class ComparatorRepository {
  static async findByUserAndPeriod(
    database: typeof db,
    {
      userId,
      periodKey,
    }: {
      userId: string;
      periodKey: string;
    },
  ): Promise<ComparatorUsageRecord | null> {
    const [record] = await database
      .select()
      .from(comparatorUsageTable)
      .where(
        and(
          eq(comparatorUsageTable.userId, userId),
          eq(comparatorUsageTable.periodKey, periodKey),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  static async consumeMonthlyQuota(
    database: typeof db,
    {
      userId,
      periodKey,
      limit,
    }: {
      userId: string;
      periodKey: string;
      limit: number;
    },
  ): Promise<ComparatorUsageRecord | null> {
    const [record] = await database
      .insert(comparatorUsageTable)
      .values({
        userId,
        periodKey,
        comparisonsCount: 1,
      })
      .onConflictDoUpdate({
        target: [comparatorUsageTable.userId, comparatorUsageTable.periodKey],
        set: {
          comparisonsCount: sql`${comparatorUsageTable.comparisonsCount} + 1`,
          updatedAt: new Date(),
        },
        setWhere: sql`${comparatorUsageTable.comparisonsCount} < ${limit}`,
      })
      .returning();

    return record ?? null;
  }

  static async incrementMonthlyQuota(
    database: typeof db,
    {
      userId,
      periodKey,
    }: {
      userId: string;
      periodKey: string;
    },
  ): Promise<ComparatorUsageRecord> {
    const [record] = await database
      .insert(comparatorUsageTable)
      .values({
        userId,
        periodKey,
        comparisonsCount: 1,
      })
      .onConflictDoUpdate({
        target: [comparatorUsageTable.userId, comparatorUsageTable.periodKey],
        set: {
          comparisonsCount: sql`${comparatorUsageTable.comparisonsCount} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!record) {
      throw new Error("Failed to increment comparator quota");
    }

    return record;
  }

  static async findAiUsageByUserAndPeriod(
    database: typeof db,
    {
      userId,
      periodKey,
    }: {
      userId: string;
      periodKey: string;
    },
  ): Promise<ComparatorAiUsageRecord | null> {
    const [record] = await database
      .select()
      .from(comparatorAiUsageTable)
      .where(
        and(
          eq(comparatorAiUsageTable.userId, userId),
          eq(comparatorAiUsageTable.periodKey, periodKey),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  static async consumeAiMonthlyQuota(
    database: typeof db,
    {
      userId,
      periodKey,
      limit,
    }: {
      userId: string;
      periodKey: string;
      limit: number;
    },
  ): Promise<ComparatorAiUsageRecord | null> {
    const [record] = await database
      .insert(comparatorAiUsageTable)
      .values({
        userId,
        periodKey,
        analysesCount: 1,
      })
      .onConflictDoUpdate({
        target: [
          comparatorAiUsageTable.userId,
          comparatorAiUsageTable.periodKey,
        ],
        set: {
          analysesCount: sql`${comparatorAiUsageTable.analysesCount} + 1`,
          updatedAt: new Date(),
        },
        setWhere: sql`${comparatorAiUsageTable.analysesCount} < ${limit}`,
      })
      .returning();

    return record ?? null;
  }

  static async findAiCache(
    database: typeof db,
    {
      userId,
      periodKey,
      requestHash,
      model,
      promptVersion,
    }: {
      userId: string;
      periodKey: string;
      requestHash: string;
      model: string;
      promptVersion: string;
    },
  ): Promise<ComparatorAiCacheRecord | null> {
    const [record] = await database
      .select()
      .from(comparatorAiCacheTable)
      .where(
        and(
          eq(comparatorAiCacheTable.userId, userId),
          eq(comparatorAiCacheTable.periodKey, periodKey),
          eq(comparatorAiCacheTable.requestHash, requestHash),
          eq(comparatorAiCacheTable.model, model),
          eq(comparatorAiCacheTable.promptVersion, promptVersion),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  static async upsertAiCache(
    database: typeof db,
    {
      userId,
      periodKey,
      requestHash,
      model,
      promptVersion,
      response,
    }: {
      userId: string;
      periodKey: string;
      requestHash: string;
      model: string;
      promptVersion: string;
      response: unknown;
    },
  ): Promise<ComparatorAiCacheRecord> {
    const [record] = await database
      .insert(comparatorAiCacheTable)
      .values({
        userId,
        periodKey,
        requestHash,
        model,
        promptVersion,
        response,
      })
      .onConflictDoUpdate({
        target: [
          comparatorAiCacheTable.userId,
          comparatorAiCacheTable.periodKey,
          comparatorAiCacheTable.requestHash,
          comparatorAiCacheTable.model,
          comparatorAiCacheTable.promptVersion,
        ],
        set: {
          response,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!record) {
      throw new Error("Failed to cache comparator AI analysis");
    }

    return record;
  }
}
