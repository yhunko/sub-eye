import { CurrenciesMap } from "@shared/domains/currency";
import { pipe, string, transform, check } from "valibot";

export const currencyBaseSchema = pipe(
  string(),
  transform((value) => value.trim().toLowerCase()),
  check((value) => CurrenciesMap.has(value), "Unsupported currency code"),
);
