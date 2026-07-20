# @subeye/currency — rate-table contract

Pure. No `fetch`, no cache, no `db`. If you are about to add any of those, you are in the
wrong package — implementations live in `apps/server`.

## What a rate table is

`RateTable = Record<string, number>`, keyed by **lowercase** ISO code. The value answers
"how many units of this currency equal one unit of the base". Converting *into* the base is
therefore a **division**: `amount / table[from]`. That inversion is the single most common
bug in currency code — read it twice before touching a conversion.

## Invariants

1. **Keys are lowercase, always.** The upstream envelope is keyed by the lowercase base code.
   `extractRateTable` lowercases the base before the lookup so callers may pass either case.
   Anything that indexes a `RateTable` must lowercase first (`CurrencyUtils.normalizeCode` in
   `@subeye/shared` does this).
2. **A missing rate is not an error.** `CurrencyService.getRates` returns `{}` when the
   `fx_rates` row is absent, and `CurrencyUtils.convert` returns the amount unchanged on a miss.
   The product decision behind this: a dashboard that shows unconverted amounts is better than a
   dashboard that shows an error. Do not make any of this throw.
3. **Rates come from the `fx_rates` table, not from this package.** This package owns only the
   `RateTable` shape (consumed by `@subeye/spend` and `@subeye/pricing`). The IO — reading the
   table, deriving cross-rates, refreshing from the CDN — lives in
   `apps/server/src/domains/currency` (`FxRateRepository` + `CurrencyService`). Never add a
   provider seam or a `fetch` here.

## What lives elsewhere, deliberately

- `CurrencyUtils` (`convert`, `toMonthly`, `formatAmount`, `normalizeCode`) and `CurrenciesMap`
  are in **`@subeye/shared`**. They are consumed by ~30 files across client and server; moving
  them buys nothing. Do not duplicate them here.
- Rate IO is in **`apps/server/src/domains/currency`**: `FxRateRepository` (owns `db`) reads
  and upserts the `fx_rates` table, and `CurrencyService` derives any base's cross-rates from
  the stored USD document and refreshes it from a pinned CDN build on a daily Worker cron.

## Known defect, unfixed on purpose

`currencyBaseSchema` uppercases its input and then checks `CurrenciesMap.has(value)` — but
`CurrenciesMap` is keyed by lowercase. It therefore rejects every input. It has no importer
today. `packages/currency/test/currencySchemas.test.ts` is a characterization test that locks
in this behaviour so the extraction was provably faithful. Fixing it belongs to the plan that
first wires the schema into a route.

## tsconfig note

This package's `tsconfig.json` deliberately omits the `"ignoreDeprecations": "6.0"` line that
`packages/shared` carries. Shared only compiles with it because it resolves a nested
TypeScript 6.0.2; a package that gets the hoisted 5.9.3 fails with `TS5103: Invalid value for
'--ignoreDeprecations'`. The option only suppresses deprecation warnings for options this
config does not use, so omitting it type-checks clean under both compilers. Copy *this*
tsconfig for new packages, not shared's.
