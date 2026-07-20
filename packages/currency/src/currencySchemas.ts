import { CurrenciesMap } from "@subeye/shared";
import { check, pipe, string, transform } from "valibot";

/**
 * Validates a currency code at a trust boundary (route payload, query param).
 * Normalizes first — trim + uppercase — then rejects anything the app does not
 * have a `Currency` entry for. Rejecting here is what keeps an unknown code out
 * of the rate table, where a miss silently degrades to an exchange rate of 1.
 */
export const currencyBaseSchema = pipe(
  string(),
  transform((value) => value.trim().toUpperCase()),
  check((value) => CurrenciesMap.has(value), "Unsupported currency code"),
);
