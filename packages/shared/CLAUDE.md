# @subeye/shared — schemas, DTOs, and the status vocabulary

Consumed by every other workspace, so this is the one package where a careless
rename lands in the API contract, the mobile client, and the database at once.
Source-only: `exports` points at `./src/index.ts`, `noEmit`, no `dist`.

Valibot for every schema. `date-fns` + `@date-fns/tz` for every date operation —
never hand-rolled arithmetic.

## Two status vocabularies exist. Do not compare across them.

This is the trap in this package.

| | values | where |
| --- | --- | --- |
| `subscriptionStatuses` | `active`, `paused`, `cancelling`, `cancelled` | the persisted `subscription_status` pgEnum — what DTOs and SQL filters use |
| `subscriptionLifecycleStatuses` | `active`, `cancelledButActive`, `cancelled` | legacy derived vocabulary, kept only as the return type of `getSubscriptionLifecycleStatus` |

`cancelledButActive` and `cancelling` are **the same state under two names**. A
comparison against the wrong vocabulary type-checks against `string` in places
and silently never matches. Reach for `subscriptionStatuses` unless you are
specifically calling `getSubscriptionLifecycleStatus`.

**`subscriptionStatuses` order is the pgEnum order** — reordering it needs a
migration. See the comment in `subscriptionStatus.ts`.

## Invariants

1. **`deriveSubscriptionStatus` must agree with the backfill SQL** in
   `apps/server/drizzle/0000_v4_baseline.sql`. It is both the reference implementation the
   pause/cancel services write through and the spec that one-off backfill
   implements. Change one, change both. Cancellation outranks pause.
2. **`getAllowedActions` is the only place lifecycle affordances are decided.**
   It ships on every `SubscriptionDto` so the client renders what the server
   permits instead of re-deriving the rules and drifting. Never re-implement
   the rules client-side; add the case here.
3. **Everything public is re-exported through the barrels.** `src/index.ts`
   re-exports each domain's `index.ts`. A symbol not exported there is not
   importable by consumers, who only ever import `@subeye/shared`.
4. **This package is a leaf.** It imports from no other `@subeye/*` package,
   and it must stay that way — `pricing`, `spend`, and the server all depend on
   it, so any edge outward becomes a cycle. `shouldIncludeOccurrence` and
   `isCurrentlyActiveSubscription` live here rather than in `@subeye/pricing`
   for exactly this reason: `@subeye/spend` consumes them.

## Tests

`bun test ./test` — a `test/` directory, unlike `pricing` and `spend`, which
co-locate `*.test.ts` beside the source.
