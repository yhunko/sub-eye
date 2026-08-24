# @subeye/model — records, DTOs, and the status vocabulary

Consumed by every other workspace, so this is the one package where a careless
rename lands in the API contract, the mobile client, and the database at once.
Source-only: `exports` points at `./src/index.ts`, `noEmit`, no `dist`.

Valibot for every schema. Every date operation goes through `@subeye/time` —
never hand-rolled arithmetic, never a raw `Date` getter.

## The status vocabulary is declared here; the rules that read it are not.

`subscriptionStatuses` and `subscriptionAllowedActions` live in
`src/types/enums.ts` because the DTO schemas validate against them. Everything
that *decides* with them — `deriveSubscriptionStatus`, `getAllowedActions`,
`getSubscriptionLifecycleStatus`, the pure transitions — lives in
`@subeye/lifecycle`, which imports this package and therefore cannot be imported
back. See [packages/lifecycle/CLAUDE.md](../lifecycle/CLAUDE.md) for the trap
about the second, legacy vocabulary.

**`subscriptionStatuses` order is the pgEnum order** — reordering it needs a
migration. See the comment in `src/types/enums.ts`.

## Invariants

1. **The date columns are not all the same kind of value, and this is the trap.**
   `willBeCancelledAt` and `resumeAt` are calendar DAYS, compared day-to-day.
   `pausedAt` is an INSTANT — the moment the user tapped pause — and must stay
   one: floored to its day it would read as "paused since midnight" and
   `isOccurrencePaused` would drop a charge that was really taken that morning.
   Every schema here has to keep that distinction; `@subeye/lifecycle` is where
   it is enforced at runtime.
2. **Everything public is re-exported through the barrels.** `src/index.ts`
   re-exports each domain's `index.ts`. A symbol not exported there is not
   importable by consumers, who only ever import `@subeye/model`.
3. **`@subeye/time` is the only package this one may import.** `lifecycle`,
   `pricing`, `spend`, and the server all depend on this package, so any other
   edge outward becomes a cycle — `time` is safe only because it is a leaf and
   imports nothing back.

## Tests

`bun test ./test` — a `test/` directory, unlike `pricing` and `spend`, which
co-locate `*.test.ts` beside the source.
