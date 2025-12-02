import { pgTable, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { currencyEnum } from "./enums.schema";

export const exchangeRatesTable = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  fromCurrency: currencyEnum("from_currency").notNull(),
  toCurrency: currencyEnum("to_currency").notNull(),
  rate: numeric("rate", { precision: 18, scale: 6 }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export type ExchangeRate = typeof exchangeRatesTable.$inferSelect;
export type NewExchangeRate = typeof exchangeRatesTable.$inferInsert;
