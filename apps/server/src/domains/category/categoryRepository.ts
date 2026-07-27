import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { categoriesTable } from "../../db/schema";

export type CategoryRecord = typeof categoriesTable.$inferSelect;
export type CategoryInsert = typeof categoriesTable.$inferInsert;

export class CategoryRepository {
  static async findByUserId(
    userId: string,
    database: typeof db = db,
  ): Promise<CategoryRecord[]> {
    return database
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId))
      .orderBy(asc(categoriesTable.createdAt));
  }

  static async findById(
    id: string,
    database: typeof db = db,
  ): Promise<CategoryRecord | null> {
    const [result] = await database
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id));

    return result ?? null;
  }

  static async findByIdsForUser(
    userId: string,
    ids: string[],
    database: typeof db = db,
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
    userId: string,
    database: typeof db = db,
  ): Promise<number> {
    const [result] = await database
      .select({ count: count() })
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId));

    return result?.count ?? 0;
  }

  static async create(
    data: CategoryInsert,
    database: typeof db = db,
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
    id: string,
    data: Partial<CategoryInsert>,
    database: typeof db = db,
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

  static async delete(id: string, database: typeof db = db): Promise<void> {
    await database.delete(categoriesTable).where(eq(categoriesTable.id, id));
  }

  static async deleteByIds(
    ids: string[],
    database: typeof db = db,
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
    userId: string,
    ids: string[],
    database: typeof db = db,
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
    userId: string,
    database: typeof db = db,
  ): Promise<void> {
    await database
      .delete(categoriesTable)
      .where(eq(categoriesTable.userId, userId));
  }
}
