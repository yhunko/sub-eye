# @subeye/model — records, DTOs, and the status vocabulary

Consumed by every other workspace, so this is the one package where a careless
rename lands in the API contract, the mobile client, and the database at once.
Source-only: `exports` points at `./src/index.ts`, `noEmit`, no `dist`.

Valibot for every schema. Every date operation goes through `@subeye/time` —
never hand-rolled arithmetic, never a raw `Date` getter.

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

1. **`deriveSubscriptionStatus` is the reference implementation the pause/cancel
   services write through.** Cancellation outranks pause. It must be called with
   the account's `preferredTimezone` wherever one is in hand — the transitions it
   decides land on a calendar day boundary, and without a zone that boundary is
   00:00 UTC rather than the start of the user's day.

   It no longer has to match the backfill SQL in
   `apps/server/drizzle/0000_v4_baseline.sql`, which compares against
   `now() at time zone 'utc'` and can therefore disagree at a day boundary. That
   backfill has run on every branch and is baseline-only: the SQL is history, not
   a second implementation to keep in step. `test/status-backfill-parity.test.ts`
   is opt-in and inherits the same caveat.

   **The date columns are not all the same kind of value, and this is the trap.**
   `willBeCancelledAt` and `resumeAt` are calendar DAYS, compared day-to-day.
   `pausedAt` is an INSTANT — the moment the user tapped pause — and must stay
   one: floored to its day it would read as "paused since midnight" and
   `isOccurrencePaused` would drop a charge that was really taken that morning.
   `willBeCancelledAt` is written as a day by both writers, but the immediate
   cancel had to be taught to; it is floored on read anyway.
2. **`getAllowedActions` is the only place lifecycle affordances are decided.**
   It ships on every `SubscriptionDto` so the client renders what the server
   permits instead of re-deriving the rules and drifting. Never re-implement
   the rules client-side; add the case here.
3. **Everything public is re-exported through the barrels.** `src/index.ts`
   re-exports each domain's `index.ts`. A symbol not exported there is not
   importable by consumers, who only ever import `@subeye/model`.
4. **`@subeye/time` is the only package this one may import.** `pricing`,
   `spend`, and the server all depend on this package, so any other edge outward
   becomes a cycle — `time` is safe only because it is a leaf and imports
   nothing back. `shouldIncludeOccurrence` and `isCurrentlyActiveSubscription`
   live here rather than in `@subeye/pricing` for exactly this reason:
   `@subeye/spend` consumes them.

## Tests

`bun test ./test` — a `test/` directory, unlike `pricing` and `spend`, which
co-locate `*.test.ts` beside the source.
