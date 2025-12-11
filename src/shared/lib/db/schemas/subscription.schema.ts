import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { periodEnum } from "./enums.schema";
import { Period } from "../model/enums";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),

  // Cost in original currency
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  currency: integer().notNull(),

  // Billing period
  every: integer("every").notNull().default(1),
  period: periodEnum("period").notNull().default(Period.MONTH),

  // Payment details
  nextPaymentDate: timestamp("next_payment_date").notNull(),
  autoPaid: boolean("auto_paid").notNull().default(false),

  // Category
  category: text("category"),

  // Additional details
  notes: text("notes"),

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type SubscriptionSchema = typeof subscriptionsTable.$inferSelect;
export type AddSubscriptionSchema = typeof subscriptionsTable.$inferInsert;
