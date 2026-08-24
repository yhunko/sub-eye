# @subeye/money — codes, rates, conversion

## Invariants

- Currency codes are LOWERCASE everywhere. `normalizeCode` on every read and
  every write; a mixed-case code silently misses every rate lookup.
- A `RateTable` value is "units of that currency per one unit of the base", so
  converting INTO the base is a DIVISION. Inverting this breaks every amount in
  the app without throwing. `test/crossRates.test.ts` pins the direction.
- A missing rate degrades to 1:1 and never throws. An unconverted amount on the
  dashboard beats an error screen. Do not make it throw.
- This package parses an FX document; it never fetches one. The caller owns the
  network, the timeout and the cache — that is what lets the same code run on a
  Worker cron and on a phone.
