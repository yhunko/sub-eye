# @subeye/model — the period, status and price-phase vocabulary

Consumed by `money`, `pricing` and the landing site. Source-only: `exports`
points at `./src/index.ts`, `noEmit`, no `dist`. Types and constants only — no
schemas, no runtime dependencies, no tests.

## Invariants

1. **Everything public is re-exported through the barrels.** `src/index.ts`
   re-exports each domain's `index.ts`; consumers only import `@subeye/model`.
2. **This package imports no other `@subeye/*` package.** `money` and `pricing`
   depend on it, so any edge outward becomes a cycle.
