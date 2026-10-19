# @subeye/model — records, DTOs, and the status vocabulary

Consumed by `money`, `pricing` and the landing site. Source-only: `exports`
points at `./src/index.ts`, `noEmit`, no `dist`.

Valibot for every schema. Date arithmetic goes through `@subeye/time` — never
hand-rolled, never a raw `Date` getter.

## Invariants

1. **The date columns are not all the same kind of value, and this is the trap.**
   `willBeCancelledAt` and `resumeAt` are calendar DAYS, compared day-to-day.
   `pausedAt` is an INSTANT — the moment the user tapped pause — and must stay
   one: floored to its day it would read as "paused since midnight" and drop a
   charge that was really taken that morning. The iOS app's `SubEyeCore` keeps
   the same distinction.
2. **Everything public is re-exported through the barrels.** `src/index.ts`
   re-exports each domain's `index.ts`; consumers only import `@subeye/model`.
3. **`@subeye/time` is the only package this one may import.** `money` and
   `pricing` depend on this package, so any other edge outward becomes a cycle.

## Tests

`bun test ./test` — a `test/` directory, unlike `pricing`, which co-locates
`*.test.ts` beside the source.
