# @subeye/server — API guidelines

Hono on a single Cloudflare Worker. Neon Postgres via Drizzle, Clerk auth.
`src/index.ts` mounts every router under the `/api` base path; see
[README.md](README.md) for the route surface, env bindings, and db commands.

```
src/domains/<domain>/   service + repository per domain
                        (analytics, category, currency, subscription, user)
src/routes/             Hono routers — validation + delegation, no logic
src/db/                 schema.ts + the Drizzle client
src/middleware/         auth, error mapping
```

**Layering:** routes → services → repositories. A repository owns `db` and is a
leaf — it never imports a service. `bun run check:boundaries` fails the build on
a violation (`server-repository-is-leaf`).

**The rules live in `@subeye/store`.** A service here is an adapter: it builds
that package's `Ports` for the authenticated user (`src/domains/ports.ts`) and
delegates. Do not add domain logic to a service — put it in the store, where the
mobile app will reach it too.

Most of this file is about pricing phases, because that is where the sharp edges
are.

---

## Pricing phases

The pricing-phase model is the core of the server. It decides what a user is
charged and when, so bugs here are silently wrong money. Read this before
touching `subscriptionPhaseService.ts` or `subscriptionPricePhaseRepository.ts`.

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
| `packages/store/src/phaseUseCases.ts` | All phase logic — create, cancel, apply, settle |
| `packages/store/src/subscriptionUseCases.ts` | Subscription CRUD and the lifecycle transitions |
| `src/domains/ports.ts` | The `Ports` for one user — every tenant filter lives here |
| `src/domains/subscription/subscriptionPricePhaseRepository.ts` | Phase persistence; owns `db` |
| `packages/lifecycle/src/lifecycleStatus.ts` | Derives lifecycle status from `willBeCancelledAt` |

---

## Invariants — do not break these

### `appliedAt` is the idempotency anchor

`applyPhaseByWorkflow` and `applyBoundaryBatch` are **no-ops once `appliedAt` is
set**. This is what makes the apply path safe to call repeatedly from any
number of entry points. Never apply a phase without checking `appliedAt` first,
and never clear it.

### The store is single-tenant; this app is not

No record in `@subeye/store` carries a `userId`. The ownership checks the
services used to make (`existing.userId !== userId`) did not move with the
logic — they were replaced by `createPorts(userId)`, which filters every read
and puts the tenant in the WHERE clause of every write. `byId` answers `null`
for another user's row rather than handing it over. A port implementation
without that filter hands every user everyone else's data and nothing else in
the suite notices; `test/server-ports.test.ts` is what catches it.

### Phases are applied lazily, on read

There is no scheduler. The list read (`GET /subscriptions`) is pure: it loads
phase rows and maps them, and never writes. The single-subscription read
(`GET /subscriptions/:id`) is the one read allowed to write — `getSubscription`
calls `applyDuePhases`, which finds phases whose `startsAt` has passed and whose
`appliedAt` is null (`selectDuePhases`) and settles them.

This means **a phase boundary fires the next time the user opens that
subscription, not at the instant it comes due.** That is the intended v4
behaviour. Do not reintroduce a scheduler, and do not move writes onto the
list read.

### `db.batch`, never `db.transaction`

Neon's `neon-http` driver has **no interactive transactions** —
`db.transaction()` throws at runtime. The store's `phases.applyBoundary` port is
one call precisely so a host can group its four writes; here that is
`applyBoundaryBatch`, which uses `db.batch([...])`. Any new multi-statement
group that must be atomic does the same.

### Services take an optional `ports` param; repositories own `db`

A service signature ends in `ports: Ports = createPorts(userId)`. Tests pass a
`createPorts(userId, fakeDeps)`. Services must not import `db` directly — that
is the repository's job, and repositories are leaves (they never import a
service).

---

## Tests

`bun test ./test` — unit tests over fake repositories. Nothing here talks to
Postgres.

The `test` script pins a placeholder `DATABASE_URL` when the environment has
none. Every service reaches a repository, every repository imports
`src/db/index.ts`, and that module **throws at import** on a missing
`DATABASE_URL` — so without the placeholder the suite dies during module
evaluation and reports a cascade of `Cannot access 'X' before initialization`,
even though no test issues a query. A real value still wins, and the Worker
keeps its fail-loudly-at-boot behaviour.

**A local pass proves less than it looks.** `apps/server/.env` supplies
`DATABASE_URL`, so the suite goes green locally whether or not the placeholder
is there; CI has no `.env` and is the only place the difference shows. Turbo
caches `test`, so a cache hit can also replay a green log for code that would
fail if it actually ran — `turbo test --force` is what checks the claim.

---

## Adding a new phase kind

1. Add the value to `pricePhaseKindEnum` in `src/db/schema.ts` and to the
   Valibot schema in `packages/model/.../pricePhaseSchemas.ts`.
2. Decide how `startPricingSchedule` (in `packages/store`) lays it down — most
   kinds are "override phase now + `standard` phase after `endsAt`".
3. Make sure `applyDuePhases` can settle it: it must have a `startsAt` and a
   null `appliedAt`.
4. Add a case to `packages/store/test/phaseUseCases.test.ts`.
