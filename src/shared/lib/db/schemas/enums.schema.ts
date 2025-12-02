import { pgEnum } from "drizzle-orm/pg-core";

export const currencyEnum = pgEnum("currency", ["UAH", "EUR", "USD"]);
export const periodEnum = pgEnum("period", ["day", "week", "month", "year"]);
