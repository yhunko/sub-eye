import { CurrenciesMap } from "@subeye/shared";
import { check, pipe, string, transform } from "valibot";

export const currencyBaseSchema = pipe(
  string(),
  transform((value) => value.trim().toUpperCase()),
  check((value) => CurrenciesMap.has(value), "Unsupported currency code"),
);
