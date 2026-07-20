/**
 * A flat exchange-rate table for one base currency.
 *
 * Keys are LOWERCASE ISO codes. The value is "how many units of that currency
 * equal one unit of the base". Converting an amount INTO the base is therefore
 * a division: `amount / table[from]` (see `CurrencyUtils.convert` in
 * `@subeye/shared`). A missing key means "no rate known" and every consumer
 * degrades to 1:1 rather than throwing.
 */
export type RateTable = Record<string, number>;

/**
 * The raw envelope shape returned by the upstream rate source: a `date` field
 * plus exactly one key — the lowercase base currency — holding the table.
 */
export type CurrencyRatesResponse = {
  date: string;
} & {
  [baseCurrency: string]: Record<string, number>;
};

/**
 * The contract any rate source must satisfy. `null` means "no rates available";
 * it is not an error, it is a degraded read. Implementations live in
 * `apps/server` because they perform IO — a CDN fetch today, the `fx_rates`
 * table from Plan 3 onwards.
 */
export type RateProvider = {
  getRates(base: string): Promise<CurrencyRatesResponse | null>;
};

/** Unwraps the envelope into a flat `RateTable`, or `{}` when unavailable. */
export const extractRateTable = (
  response: CurrencyRatesResponse | null,
  base: string,
): RateTable => response?.[base.toLowerCase()] ?? {};
