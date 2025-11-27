import {
  pgEnum,
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const currencyEnum = pgEnum("currency", ["UAH", "EUR", "USD"]);
export const periodEnum = pgEnum("period", ["day", "week", "month", "year"]);

export const exchangeRatesTable = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  fromCurrency: currencyEnum("from_currency").notNull(),
  toCurrency: currencyEnum("to_currency").notNull(),
  rate: numeric("rate", { precision: 18, scale: 6 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type ExchangeRate = typeof exchangeRatesTable.$inferSelect;
export type NewExchangeRate = typeof exchangeRatesTable.$inferInsert;

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),

  // Cost in original currency
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull(),

  // Billing period
  every: integer("every").notNull().default(1),
  period: periodEnum("period").notNull().default("month"),

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
export type SubscriptionDto = typeof subscriptionsTable.$inferSelect;
export type AddSubscriptionDto = typeof subscriptionsTable.$inferInsert;
