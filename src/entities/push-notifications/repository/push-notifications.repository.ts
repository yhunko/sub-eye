import {
  pushNotificationsTable,
  AddPushNotificationSchema,
} from "@/shared/lib/db/schemas/push-notifications.schema";
import { eq, and } from "drizzle-orm";
import { db } from "@/shared/lib/drizzle/client";

export class PushNotificationsRepository {
  async findByUserId(userId: string) {
    return db
      .select()
      .from(pushNotificationsTable)
      .where(eq(pushNotificationsTable.userId, userId));
  }

  async create(params: AddPushNotificationSchema) {
    const [result] = await db
      .insert(pushNotificationsTable)
      .values(params)
      .onConflictDoNothing()
      .returning();
    return result;
  }

  async deleteByUserIdAndEndpoint(userId: string, endpoint: string) {
    await db
      .delete(pushNotificationsTable)
      .where(
        and(
          eq(pushNotificationsTable.userId, userId),
          eq(pushNotificationsTable.endpoint, endpoint),
        ),
      );
  }

  async deleteByUserId(userId: string) {
    await db
      .delete(pushNotificationsTable)
      .where(eq(pushNotificationsTable.userId, userId));
  }
}
