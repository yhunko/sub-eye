import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../db";
import { telegramLinksTable, telegramLinkTokensTable } from "../../db/schema";

export type TelegramLinkRecord = typeof telegramLinksTable.$inferSelect;
export type TelegramLinkInsert = typeof telegramLinksTable.$inferInsert;

export type TelegramLinkTokenRecord =
  typeof telegramLinkTokensTable.$inferSelect;
export type TelegramLinkTokenInsert =
  typeof telegramLinkTokensTable.$inferInsert;

export class TelegramNotificationRepository {
  static async findLinkByUserId(
    userId: string,
  ): Promise<TelegramLinkRecord | null> {
    const [record] = await db
      .select()
      .from(telegramLinksTable)
      .where(eq(telegramLinksTable.userId, userId))
      .limit(1);

    return record ?? null;
  }

  static async findLinkByChatId(
    chatId: string,
  ): Promise<TelegramLinkRecord | null> {
    const [record] = await db
      .select()
      .from(telegramLinksTable)
      .where(eq(telegramLinksTable.chatId, chatId))
      .limit(1);

    return record ?? null;
  }

  static async upsertLink(
    payload: Omit<TelegramLinkInsert, "id" | "createdAt" | "updatedAt">,
  ): Promise<TelegramLinkRecord> {
    const [record] = await db
      .insert(telegramLinksTable)
      .values(payload)
      .onConflictDoUpdate({
        target: [telegramLinksTable.userId],
        set: {
          chatId: payload.chatId,
          telegramUserId: payload.telegramUserId,
          telegramUsername: payload.telegramUsername ?? null,
          isEnabled: payload.isEnabled ?? true,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!record) {
      throw new Error("Failed to upsert telegram link");
    }

    return record;
  }

  static async updateLinkEnabledByUserId(
    userId: string,
    isEnabled: boolean,
  ): Promise<TelegramLinkRecord | null> {
    const [record] = await db
      .update(telegramLinksTable)
      .set({ isEnabled, updatedAt: new Date() })
      .where(eq(telegramLinksTable.userId, userId))
      .returning();

    return record ?? null;
  }

  static async deleteLinkByUserId(userId: string): Promise<void> {
    await db
      .delete(telegramLinksTable)
      .where(eq(telegramLinksTable.userId, userId));
  }

  static async deleteLinkByChatId(chatId: string): Promise<void> {
    await db
      .delete(telegramLinksTable)
      .where(eq(telegramLinksTable.chatId, chatId));
  }

  static async createToken(
    payload: Omit<TelegramLinkTokenInsert, "id" | "createdAt">,
  ): Promise<TelegramLinkTokenRecord> {
    const [record] = await db
      .insert(telegramLinkTokensTable)
      .values(payload)
      .returning();

    if (!record) {
      throw new Error("Failed to create telegram link token");
    }

    return record;
  }

  static async consumeValidToken(
    token: string,
  ): Promise<TelegramLinkTokenRecord | null> {
    const [record] = await db
      .update(telegramLinkTokensTable)
      .set({ consumedAt: new Date().toISOString() })
      .where(
        and(
          eq(telegramLinkTokensTable.token, token),
          isNull(telegramLinkTokensTable.consumedAt),
          gt(telegramLinkTokensTable.expiresAt, new Date().toISOString()),
        ),
      )
      .returning();

    return record ?? null;
  }

  static async deleteTokensByUserId(userId: string): Promise<void> {
    await db
      .delete(telegramLinkTokensTable)
      .where(eq(telegramLinkTokensTable.userId, userId));
  }

  static async deleteAllForUser(userId: string): Promise<void> {
    await Promise.all([
      this.deleteLinkByUserId(userId),
      this.deleteTokensByUserId(userId),
    ]);
  }

  static async deleteTokenByToken(token: string): Promise<void> {
    await db
      .delete(telegramLinkTokensTable)
      .where(eq(telegramLinkTokensTable.token, token));
  }

  static async findTokenByUserId(
    userId: string,
  ): Promise<TelegramLinkTokenRecord | null> {
    const [record] = await db
      .select()
      .from(telegramLinkTokensTable)
      .where(
        and(
          eq(telegramLinkTokensTable.userId, userId),
          isNull(telegramLinkTokensTable.consumedAt),
          gt(telegramLinkTokensTable.expiresAt, new Date().toISOString()),
        ),
      )
      .limit(1);

    return record ?? null;
  }
}
