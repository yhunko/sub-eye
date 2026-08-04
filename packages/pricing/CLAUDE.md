# @subeye/pricing — the phase model

Pure. No `db`, no `fetch`, no error classes from `apps/server`. Every function takes "now" as a
parameter or defaults it explicitly.

## What a pricing phase is

A subscription's price over time is an ordered schedule of phases stored in
`subscription_price_phases`. Each has a `kind`:

| kind | meaning |
|---|---|
| `trial` | an initial window, usually cost 0, ending on a fixed date |
| `intro` | a reduced price for a fixed window, then reverts |
| `scheduledChange` | a new standard price taking over on a future date |
| `standard` | the open-ended price paid once specials end |

The subscription row's own `cost`/`currency` always mean **what you pay right now**. Phases
describe the transitions around that value; they never replace it as the source of truth for
the current charge.

## Invariants

1. **`appliedAt` is the idempotency anchor.** `null` means "pending". Once stamped, the phase's
   price has been copied onto the subscription row and every apply path becomes a no-op.
   `selectDuePhases` filters on it. Never derive "already applied" from a date comparison.
   (Until v4 Plan 1 a QStash workflow also fired boundaries, which is where this column came
   from. QStash is gone; the lazy reconciler that runs on every read is now the only firing
   path. Keep the anchor anyway — it is what makes the reconciler safe to run repeatedly.)
2. **Windows are half-open: `[startsAt, endsAt)`.** A phase ending at exactly `now` is over; a
   phase starting at exactly `now` has begun. This is what stops two phases claiming the same
   instant. `getEffectivePhase` and `toPricePhaseDto`'s `isActive` both encode it, and they must
   stay in agreement.
3. **Due phases apply oldest-first.** Each apply overwrites the subscription's cost. Applying
   out of order leaves the row holding a price from the middle of the timeline.
   `selectDuePhases` sorts; do not re-sort or re-filter downstream.
4. **`effectivePhaseKind` is the kind of whichever phase is effective right now** —
   `getEffectivePhase(phases, now)?.kind ?? "standard"`. It and each phase DTO's `isActive`
   derive from the same half-open window rule, so they can never disagree. A pending
   `scheduledChange` sitting in the future is not effective yet, so it stays `standard` until its
   window opens — the user is not on the new price yet. (Before v4 Plan 4 this was a hand-rolled
   scan for an active `trial`/`intro`, which silently reported `standard` for an in-force
   `scheduledChange` and could disagree with `isActive` when windows overlapped.)
5. **A pure function reports a caller error by returning `null`, never by throwing.**
   `resolveScheduledEffectiveAt` returns `null` for `mode: "customDate"` with no `customDate`;
   the server caller converts that into `CustomDateRequiredError`. Do not import server error
   classes here. Note the mode literal is `customDate`, not `custom` —
   `scheduledPriceChangeModes` in `@subeye/shared` is `["nextOccurrence", "customDate"]`.

## What stays in apps/server, deliberately

`SubscriptionPhaseService` keeps everything that awaits a repository or throws a domain error:
`startTrial`, `addIntroDiscount`, `schedulePriceChange`, `cancelPhase`, `applyPhaseNow`,
`applyPhaseByWorkflow`, `applyDuePhases`, `reconcilePhases`, `clearPendingPhases`, and
`assertPhaseWindow` (which throws four different error classes and reads lifecycle status).

`getSubscriptionLifecycleStatus`, `shouldIncludeOccurrence`, `isCurrentlyActiveSubscription`
and `subscriptionLifecycleStatuses` stay in **`@subeye/shared`**. That is cycle avoidance, not
an oversight: `shouldIncludeOccurrence` is consumed by `@subeye/spend`, so moving it here would
make `pricing` and `spend` import each other through a shared leaf. Leave them where they are.

## A phase boundary is a calendar day, floored in UTC

`toStartOfUtcDay` floors to the UTC midnight of the day — the same encoding the client writes
with `toIsoDay` and reads back with `timeZone: "UTC"` — and returns the canonical `Z` form.

It used to be `toStartOfDayInTimezone`, flooring in the account's zone, and it wrote
`2026-07-15T00:00:00.000+03:00` into `startsAt`/`endsAt`. That instant is 21:00 on the 14th in
UTC, so an offer the user ended on the 15th was displayed, reminded on, and compared as the
14th. Do not reintroduce a zoned floor here, and do not compare these values as strings —
`Date.parse` still, because a boundary may predate the fix.

## Two traps that were live bugs — keep their tests passing

Both were real defects, both are fixed, and each is pinned by a regression test in
`apps/server/test`. If you refactor the apply or cancel path, these are the tests that catch a
regression:

- **`applyPhaseNow` must close the timeline it moves.** Stamping `appliedAt` and copying the
  price is not enough — it must also close the preceding phase's `endsAt` and pull the applied
  phase's `startsAt` back to now. Skip either and the row charges the new price while
  `effectivePhaseKind` still reports `trial` and `scheduledPriceChange` stays populated;
  `getUpcomingPhase` is `appliedAt`-blind by construction, so no client can compensate.
  → `phase-apply-now-closes-timeline.test.ts`
- **Cancel must preserve pending phases.** Deleting them on cancel strands the subscription on
  the trial price forever, because renew cannot restore what was deleted.
  → `cancel-preserves-pending-phases.test.ts`
