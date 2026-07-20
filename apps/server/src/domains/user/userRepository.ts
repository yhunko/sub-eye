import { eq } from "drizzle-orm";
import { db } from "../../db";
import { usersTable } from "../../db/schema";

export type UserRecord = typeof usersTable.$inferSelect;
export type UserInsert = typeof usersTable.$inferInsert;

export class UserRepository {
  static async findById(userId: string): Promise<UserRecord | null> {
    const [result] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    return result ?? null;
  }

  /**
   * Create the row on first write, otherwise patch the given columns.
   * `onConflictDoUpdate` keeps this a single round-trip — neon-http has no
   * interactive transactions, so a read-then-write would be racy.
   */
  static async upsert(
    userId: string,
    values: Partial<Omit<UserInsert, "id">>,
  ): Promise<UserRecord> {
    const [result] = await db
      .insert(usersTable)
      .values({ ...values, id: userId })
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();

    if (!result) {
      throw new Error("Failed to upsert user preferences");
    }

    return result;
  }

  static async deleteById(userId: string): Promise<void> {
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  }
}
