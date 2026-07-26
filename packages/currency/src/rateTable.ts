/**
 * A flat exchange-rate table for one base currency.
 *
 * Keys are LOWERCASE ISO codes. The value is "how many units of that currency
 * equal one unit of the base". Converting an amount INTO the base is therefore
 * a division: `amount / table[from]` (see `CurrencyUtils.convert` in
 * `@subeye/shared`). A missing key means "no rate known" and every consumer
 * degrades to 1:1 rather than throwing — deliberately, because an unconverted
 * amount on the dashboard beats an error. Do not make it throw.
 *
 * This package is the shape only. Rate IO — reading `fx_rates`, deriving
 * cross-rates, the daily refresh — lives in `apps/server/src/domains/currency`.
 */
export type RateTable = Record<string, number>;
