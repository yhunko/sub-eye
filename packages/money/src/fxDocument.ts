import { CurrencyUtils } from "./currency";
import type { RateTable } from "./rateTable";

/**
 * The base currency actually stored. Every other base is derived from this one
 * document, so a refresh is a single fetch and a single row.
 */
export const STORED_BASE = "usd";

export type FxDocument = { date: string } & Record<
  string,
  string | Record<string, number>
>;

/**
 * Version-pinned to an immutable, date-tagged build rather than `@latest`.
 * `@latest` was previously fetched on the critical path of every read, with a
 * module-level cache that ephemeral Worker isolates mostly missed.
 */
export const fxDocumentUrl = (version: string): string =>
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/${STORED_BASE}.json`;

const dateTag = (date: Date): string =>
  `${date.getUTCFullYear()}.${date.getUTCMonth() + 1}.${date.getUTCDate()}`;

export const fxVersionCandidates = (now: Date): string[] => [
  dateTag(now),
  dateTag(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
  "latest",
];

export const readFxDocument = (
  document: FxDocument,
): { rates: RateTable; rateDate: string } | null => {
  const rates = document[STORED_BASE];
  if (typeof rates !== "object" || rates === null) return null;

  return {
    rates,
    rateDate: typeof document.date === "string" ? document.date : "",
  };
};

/**
 * Re-express a USD-based rate document with `target` as the base.
 *
 * `usdRates[x]` means "units of x per 1 USD". `CurrencyUtils.convert` computes
 * `amount / rates[from]`, so `rates[from]` must mean "units of `from` per 1 unit
 * of `to`" — which is `usdRates[from] / usdRates[to]`. Getting this direction
 * wrong inverts every conversion in the app without ever throwing.
 */
export const deriveRatesFor = (
  target: string,
  usdRates: RateTable,
): RateTable => {
  const code = CurrencyUtils.normalizeCode(target);
  const divisor = usdRates[code];

  if (!Number.isFinite(divisor) || divisor === 0) return {};

  const derived: RateTable = {};
  for (const [key, value] of Object.entries(usdRates)) {
    if (!Number.isFinite(value) || value === 0) continue;
    derived[key] = value / (divisor as number);
  }
  return derived;
};
