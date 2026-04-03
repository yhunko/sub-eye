import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import type { db } from "../../db";
import { categoriesTable } from "../../db/schema";

export type CategoryRecord = typeof categoriesTable.$inferSelect;
export type CategoryInsert = typeof categoriesTable.$inferInsert;

export class CategoryRepository {
  static async findByUserId(
    database: typeof db,
    userId: string,
  ): Promise<CategoryRecord[]> {
    return database
      .select()
      .from(categoriesTable)
      .where(
        and(eq(categoriesTable.userId, userId), isNull(categoriesTable.orgId)),
      )
      .orderBy(asc(categoriesTable.createdAt));
  }

  static async findById(
    database: typeof db,
    id: string,
  ): Promise<CategoryRecord | null> {
    const [result] = await database
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id));

    return result ?? null;
  }

  static async findByIdsForUser(
    database: typeof db,
    userId: string,
    ids: string[],
  ): Promise<CategoryRecord[]> {
    if (ids.length === 0) {
      return [];
    }

    return database
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.userId, userId),
          inArray(categoriesTable.id, ids),
        ),
      );
  }

  static async countByUserId(
    database: typeof db,
    userId: string,
  ): Promise<number> {
    const [result] = await database
      .select({ count: count() })
      .from(categoriesTable)
      .where(
        and(eq(categoriesTable.userId, userId), isNull(categoriesTable.orgId)),
      );

    return result?.count ?? 0;
  }

  static async create(
    database: typeof db,
    data: CategoryInsert,
  ): Promise<CategoryRecord> {
    const [category] = await database
      .insert(categoriesTable)
      .values(data)
      .returning();

    if (!category) {
      throw new Error("Failed to create category");
    }

    return category;
  }

  static async update(
    database: typeof db,
    id: string,
    data: Partial<CategoryInsert>,
  ): Promise<CategoryRecord> {
    const [updated] = await database
      .update(categoriesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categoriesTable.id, id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update category");
    }

    return updated;
  }

  static async delete(database: typeof db, id: string): Promise<void> {
    await database.delete(categoriesTable).where(eq(categoriesTable.id, id));
  }

  static async deleteByIds(
    database: typeof db,
    ids: string[],
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const deleted = await database
      .delete(categoriesTable)
      .where(inArray(categoriesTable.id, ids))
      .returning({ id: categoriesTable.id });

    return deleted.length;
  }

  static async deleteByIdsForUser(
    database: typeof db,
    userId: string,
    ids: string[],
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const deleted = await database
      .delete(categoriesTable)
      .where(
        and(
          eq(categoriesTable.userId, userId),
          inArray(categoriesTable.id, ids),
        ),
      )
      .returning({ id: categoriesTable.id });

    return deleted.length;
  }

  static async deleteByUserId(
    database: typeof db,
    userId: string,
  ): Promise<void> {
    await database
      .delete(categoriesTable)
      .where(
        and(eq(categoriesTable.userId, userId), isNull(categoriesTable.orgId)),
      );
  }

  static async findByOrgId(
    database: typeof db,
    orgId: string,
  ): Promise<CategoryRecord[]> {
    return database
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.orgId, orgId))
      .orderBy(asc(categoriesTable.createdAt));
  }

  static async countByOrgId(
    database: typeof db,
    orgId: string,
  ): Promise<number> {
    const [result] = await database
      .select({ count: count() })
      .from(categoriesTable)
      .where(eq(categoriesTable.orgId, orgId));

    return result?.count ?? 0;
  }

  static async deleteByOrgId(
    database: typeof db,
    orgId: string,
  ): Promise<void> {
    await database
      .delete(categoriesTable)
      .where(eq(categoriesTable.orgId, orgId));
  }
}
