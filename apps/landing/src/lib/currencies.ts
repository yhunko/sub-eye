import { CurrencyUtils } from "@subeye/money";
import type { Locale } from "./site";

/**
 * The "mixed currencies, one total" mockup, converted by the shipped rule.
 *
 * `RateTable` is keyed by the *preferred* currency: each value is how many units
 * of that currency equal one unit of the preferred one, so converting in is a
 * division (see `packages/money/src/rateTable.ts`). Building both tables from
 * one FX pair is what stops the two locales quoting totals that disagree.
 */

/** Illustrative rates for the mockup, not a live feed. */
const UAH_PER_USD = 42;
const UAH_PER_EUR = 45.5;

// Each value is "units of this currency per one unit of the home currency" —
// so the euro entry on the dollar page is EUR-per-USD, not the other way round.
// Inverting it quietly turns €12.00 into $11.08.
const rates: Record<Locale, Record<string, number>> = {
  en: { usd: 1, uah: UAH_PER_USD, eur: UAH_PER_USD / UAH_PER_EUR },
  uk: { uah: 1, usd: 1 / UAH_PER_USD, eur: 1 / UAH_PER_EUR },
};

const home: Record<Locale, string> = { en: "usd", uk: "uah" };

const ROWS = [
  { name: "Spotify", amount: 199, currency: "uah" },
  { name: "Netflix", amount: 15.99, currency: "usd" },
  { name: "Figma", amount: 12, currency: "eur" },
] as const;

export type ConvertedRow = {
  name: string;
  amount: number;
  currency: string;
  converted: number;
};

export type CurrencyMockup = {
  homeCurrency: string;
  rows: ConvertedRow[];
  total: number;
};

export const currencyMockup = (locale: Locale): CurrencyMockup => {
  const homeCurrency = home[locale];
  const table = rates[locale];

  const rows = ROWS.map((row) => ({
    ...row,
    converted: CurrencyUtils.convert(
      row.amount,
      row.currency,
      homeCurrency,
      table,
    ),
  }));

  return {
    homeCurrency,
    rows,
    total: rows.reduce((sum, row) => sum + row.converted, 0),
  };
};
