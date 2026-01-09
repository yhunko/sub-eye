import {
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const pushNotificationsTable = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    // Standard Web Push keys
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("unique_endpoint_idx").on(t.userId, t.endpoint)],
);
export type PushNotificationSchema = typeof pushNotificationsTable.$inferSelect;
export type AddPushNotificationSchema =
  typeof pushNotificationsTable.$inferInsert;
