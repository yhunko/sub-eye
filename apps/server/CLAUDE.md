# Server — Pricing Phases Guidelines

The pricing-phase model is the core of the server. It decides what a user is
charged and when, so bugs here are silently wrong money. Read this before
touching `subscriptionPhaseService.ts` or `subscriptionPricePhaseRepository.ts`.

> **History note.** This file used to document a QStash-based notification
> system (renewal/expiry/phase-boundary workflows, web-push, Telegram, and the
> `/api/dev/*` test harness). All of it was deleted in v4 Plan 1 — reminders
> become device-local via `expo-notifications` in the Expo client. If you are
> looking for the workflow-replay invariants, they no longer apply to any code
> in this repo.

---

## The model

A subscription's price over time is a schedule of ordered rows in
`subscription_price_phases`. Each phase has a `kind`
(`trial | intro | scheduledChange | standard`), a `cost`, a `startsAt`, an
optional `endsAt`, and a nullable `appliedAt`.

The `subscriptions` row's own `cost`/`currency` stay **authoritative for what
the user pays right now**. Phases describe the transitions around that value —
they do not replace it. Applying a phase means copying its price onto the
subscription row.

| File | Role |
| --- | --- |
| `src/domains/subscription/subscriptionPhaseService.ts` | All phase logic — create, cancel, apply, reconcile |
| `src/domains/subscription/subscriptionPricePhaseRepository.ts` | Phase persistence; owns `db` |
| `src/domains/subscription/subscriptionService.ts` | Subscription CRUD; calls the phase service |
| `packages/shared/src/domains/subscription/subscriptionLifecycle.ts` | Derives lifecycle status from `willBeCancelledAt` |

---

## Invariants — do not break these

### `appliedAt` is the idempotency anchor

`applyPhaseByWorkflow` and `applyBoundaryBatch` are **no-ops once `appliedAt` is
set**. This is what makes the apply path safe to call repeatedly from any
number of entry points. Never apply a phase without checking `appliedAt` first,
and never clear it.

### Phases are applied lazily, on read

There is no scheduler. `reconcilePhases` runs on every subscription fetch,
finds phases whose `startsAt` has passed and whose `appliedAt` is null, and
calls `applyDuePhases` → `applyPhaseByWorkflow` to settle them.

This means **a phase boundary fires the next time the user reads the
subscription, not at the instant it comes due.** That is the intended v4
behaviour. Do not reintroduce a scheduler for it.

`reconcilePhases` currently issues DB writes from a read path. That is a known
performance problem and is Plan 4's work — do not paper over it by caching.

### `db.batch`, never `db.transaction`

Neon's `neon-http` driver has **no interactive transactions** —
`db.transaction()` throws at runtime. `applyPhase` uses
`deps.phaseRepository.applyBoundaryBatch(...)` to group its writes atomically.
Any new multi-statement group that must be atomic uses `db.batch([...])`.

### Services take a `deps` param; repositories own `db`

`SubscriptionPhaseServiceDeps` is
`{ repository, phaseRepository, currencyService, userService, historyService }`,
defaulting to the real implementations. Tests pass fakes. Services must not
import `db` directly — that is the repository's job, and repositories are
leaves (they never import a service).

---

## Known-stale columns (Plan 3 drops them)

`schema.ts` still declares `qstash_message_id`, `cancellation_qstash_message_id`,
`price_change_qstash_message_id`, the legacy `scheduled_*` columns, and every
`org_id`. Nothing schedules anything anymore, so the services write `null` to
the qstash columns and the org branches fall back to the owning user. **Leave
them alone** — they are removed in one baseline migration in Plan 3, not
piecemeal.

---

## Adding a new phase kind

1. Add the value to `pricePhaseKindEnum` in `src/db/schema.ts` and to the
   Valibot schema in `packages/shared/.../pricePhaseSchemas.ts`.
2. Decide how `startPricingSchedule` lays it down — most kinds are "override
   phase now + `standard` phase after `endsAt`".
3. Make sure `reconcilePhases` can settle it: it must have a `startsAt` and a
   null `appliedAt`.
4. Add a case to `test/subscription-phase-service.test.ts`.
