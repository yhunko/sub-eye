# @subeye/pricing — the phase model

Pure. No `db`, no `fetch`. Every function takes "now" as a parameter or defaults it explicitly.
The landing site's price-timeline mockup is built from `buildPhaseProjection`; the iOS app
implements the same model in `SubEyeCore/Pricing.swift`, so a rule stated here holds there too.

## What a pricing phase is

A subscription's price over time is an ordered schedule of phases. Each has a `kind`:

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

1. **Windows are half-open: `[startsAt, endsAt)`.** A phase ending at exactly `now` is over; a
   phase starting at exactly `now` has begun. This is what stops two phases claiming the same
   instant. `getEffectivePhase` and `toPricePhaseDto`'s `isActive` both encode it, and they must
   stay in agreement.
2. **`effectivePhaseKind` is the kind of whichever phase is effective right now** —
   `getEffectivePhase(phases, now)?.kind ?? "standard"`. It and each phase DTO's `isActive`
   derive from the same half-open window rule, so they can never disagree. A pending
   `scheduledChange` sitting in the future is not effective yet, so it stays `standard` until its
   window opens — the user is not on the new price yet.

## Rules that now live only in the iOS app

Applying, settling and scheduling phases left this package with the retired server. They were
live bugs there, and `Pricing.swift` must keep holding them:

- **`appliedAt` is the idempotency anchor.** `null` means "pending". Once stamped, the phase's
  price has been copied onto the subscription row and every apply path becomes a no-op. Never
  derive "already applied" from a date comparison — the anchor is what makes `Pricing.settle`
  safe to run on every read.
- **Due phases apply oldest-first.** Each apply overwrites the subscription's cost. Applying
  out of order leaves the row holding a price from the middle of the timeline.
- **A phase boundary is a calendar day, floored in UTC.** Flooring in the account's zone once
  wrote `2026-07-15T00:00:00.000+03:00` — 21:00 on the 14th in UTC — so an offer the user ended
  on the 15th was displayed, reminded on, and compared as the 14th. Parse boundaries
  (`Day.parse`) before comparing, never compare them as strings, because a stored boundary may
  predate the fix.
- **`Pricing.apply` must close the timeline it moves.** Stamping `appliedAt` and copying the
  price is not enough — it must also close the preceding phase's `endsAt` and pull the applied
  phase's `startsAt` back to now. Skip either and the row charges the new price while the
  effective kind still reports `trial`; `Pricing.upcoming` is `appliedAt`-blind by
  construction, so no caller can compensate.
- **Cancel (`Lifecycle.change`) must preserve pending phases.** Deleting them on cancel strands the subscription on
  the trial price forever, because renew cannot restore what was deleted.
