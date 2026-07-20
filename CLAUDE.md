# SubEye

Subscription-management SaaS. **Bun** monorepo, orchestrated by **Turbo**.

- `apps/client` (`@subeye/client`) — React 19 + Vite PWA, **Feature-Sliced Design**.
- `apps/server` (`@subeye/server`) — **Hono** API deployed as a **single Cloudflare Worker** that serves both the API and the built client assets.
- `packages/*` — scoped `@subeye/*` libraries, separated **by concern**, consumed as **source** (see below).

**External services:** Clerk (auth — JWT per request, Svix webhooks for `user.deleted`) · Neon Postgres + Drizzle (`apps/server/src/db/schema.ts`) · FX rates in an `fx_rates` table, refreshed daily from a public FX-rate CDN by the Worker `scheduled` cron (`apps/server/src/domains/currency/currencyService.ts`).

Paddle, Upstash QStash, Google Gemini, Web Push and Telegram were **removed from the server in v4 Plan 1**. `apps/client` still references some of them and does not type-check until Plan 8 deletes it.

## Packages — source-only, by concern

| Package | Responsibility |
| --- | --- |
| `@subeye/shared` | Environment-agnostic contracts: types, Valibot schemas, enums, pure utils. Used by client **and** server. |
| `@subeye/currency` | Rate-table contract (`RateTable`). Rate IO lives in `apps/server/src/domains/currency`. **Invariants: `packages/currency/CLAUDE.md`.** |
| `@subeye/spend` | Occurrence engine: spend in a range, monthly/yearly normalization, payment dates. **Invariants: `packages/spend/CLAUDE.md`.** |
| `@subeye/pricing` | Phase model: effective/upcoming/due phase selection, timeline assembly, boundary date math. **Invariants: `packages/pricing/CLAUDE.md`.** |

**Source-only packaging (DX rule):** every package under `packages/*` points its `exports` at `./src/index.ts` — **no `dist`, no build step, no `postinstall`**. Wrangler/esbuild and Vite compile package TS source directly. Edit source and it's live; never add a build step or import a `dist/` path inside `packages/*`. The root `tsconfig.json` is flat (no path aliases / project references).

**Explicit exception — `apps/server`'s client export.** `@subeye/server/client` resolves to `apps/server/dist/src/client.d.ts` (emitted by `bun run --cwd apps/server build`, which the server's `type-check` also runs). Metro is not Vite: source-only dragged the whole server program into the Expo app's typecheck and only compiled because `@types/node` leaked in to supply `process` for the module-scope `process.env.DATABASE_URL` read in `src/db/index.ts`. The Vite path is unchanged — `apps/client` aliases `@subeye/server/client` back to `apps/server/src/client.ts` in both `vite.config.ts` and `tsconfig.app.json`. `apps/server/dist` is gitignored.

**Package layering:** `pricing → spend → currency → shared`, and any package may depend on `shared` directly. Nothing depends back on `shared`. Enforced by `bun run check:circular:packages`. The pure/impure split is forced by dependency-cruiser's `no-package-to-app` rule: repositories, IO-owning services and route handlers stay in `apps/server`; packages take structurally-typed inputs instead of Drizzle row types.

**New package tsconfig:** copy `packages/currency/tsconfig.json`, **not** `packages/shared/tsconfig.json`. Shared carries `"ignoreDeprecations": "6.0"` and only compiles because it resolves a nested TypeScript 6.0.2; a new package gets the hoisted 5.9.3 and fails with `TS5103`.

## Import boundaries (enforced by `bun run check:boundaries`)

- `apps/* → packages/*` ✅; `packages/* → apps/*` ❌ (packages never import the db, domains, or routes).
- Client → server **only** via `@subeye/server/client` (Hono RPC types). Deep imports into `apps/server/src/*` are forbidden.
- **Client FSD:** `app → pages → widgets → features → entities → shared`; a layer imports only from lower layers (no upward imports). Cross-slice reuse goes down a layer (e.g. shared logic → `entities/*`) and through a slice's public `index.ts`.
- **Server:** `Route → Service → Repository`. Repositories own `db`; services must **not** import `db`. Repositories are leaves (never import a service).

## Commands

```bash
bun install
bun run dev                       # client + server (Turbo)
bun run type-check                # all workspaces
bun run test                      # all workspaces (server: bun test ./test; client: bun test ./src)
bun run lint                      # Biome (also: lint:fix)
bun run build                     # Turbo build (client → apps/client/dist; packages need no build)
bun run check:boundaries          # dependency-cruiser: package + FSD + layer rules
bun run check:circular            # madge (client + server)
bun run --cwd apps/client prepare # compile Paraglide i18n (auto-runs before client type-check)
bun run --cwd apps/server db:generate | db:migrate | db:push   # Drizzle (Neon)
bun run deploy:dev                # build + wrangler -c dev.wrangler.jsonc deploy
```

## Conventions

- **Client:** all user-facing copy via Paraglide (`import * as m from "@/i18n/messages"`) — no hardcoded strings. Dialogs via `NiceModal.show(...)`. Query keys via `@lukemorales/query-key-factory` in each slice's `model/query-keys.ts`. TanStack Query is persisted to IndexedDB — invalidate explicitly, avoid ad-hoc `setQueryData`. Lazy-load heavy components (recharts loads via `features/analytics/ui/use-recharts-module.ts`). File names `kebab-case`.
- **Server:** validate every payload at the route with `@hono/valibot-validator`. `protect`/`clerkAuth` on authenticated routes; never re-derive identity in services. Webhook routes (`/api/webhooks/**`) skip auth and verify Svix signatures. Services accept an optional `deps` param (defaults to real impls) for testability. File names `camelCase` (modules) / `kebab-case` (route resources). DB identifiers `snake_case`.
- **Billing usage:** `GET /api/billing/usage` (`BillingService.getUsage`) + client `billingQueryKeys.usage` are the **single source of truth** for plan/quota data. Do not add parallel usage endpoints or keys.
- **Lifecycle status** is a real column (`subscriptions.status`: `active | paused | cancelling | cancelled`), kept current by the pause/cancel writes. `deriveSubscriptionStatus` in `@subeye/shared` reconciles it on read — a `cancelling` row past its date reads `cancelled`, a pause past its `resume_at` reads `active` — so there is no status cron. Legal next actions ride on `SubscriptionDto.allowedActions` (`getAllowedActions`), so the client renders affordances instead of re-deriving them.
- **Reads must not write.** `GET /subscriptions` is pure; `GET /subscriptions/:id` is the one read allowed to write, and only via `applyDuePhases` for a phase boundary that has genuinely passed.
- **FX rates** come from the `fx_rates` table; no request path fetches rates inline. The daily refresh runs in the Worker `scheduled` cron export (`CurrencyService.refreshRates`).
- **User preferences** come from the `users` table, never from Clerk `publicMetadata`.
- **Every route error** returns `{ success: false, error: { code, message } }`; codes live in `@subeye/shared` (`apiErrorCodes`).
- **Pause is per-occurrence**, not per-subscription: `isOccurrencePaused` in `@subeye/spend` skips charges inside `[paused_at, resume_at)` and **includes** the first at or after `resume_at`.

## Gotchas

- **CF Worker `process.env` is `undefined` at module load** — read secrets/vars per-request via `context.env`. (Known exception: `apps/server/src/index.ts` reads `process.env.CLIENT_ORIGIN` at module scope; it works under `nodejs_compat` and is intentionally left as-is.)
- **Neon `neon-http` driver has no interactive transactions** — `db.transaction()` throws, so the category optimization/delete paths apply their writes as plain sequential statements. Don't assume multi-statement atomicity (use `db.batch([...])` if you need an atomic group).
- **Hono RPC leaks error shapes into the client success type.** In route error handlers cast status to narrow literals (`400 | 403 | 404`), never `ContentfulStatusCode`/`StatusCode`.
- Returning 204 from middleware: use `new Response("", { status: 204 })`. Inline `.use()` middleware that can return `next()` **or** a `Response` must be `async`.
- **Generated — never hand-edit:** `apps/client/src/app/routes/routeTree.gen.ts` (TanStack Router), `apps/client/src/shared/lib/i18n/**` (Paraglide). Edit source + rerun the generator.
- Dev Plus-plan simulation: `apps/client/src/shared/lib/billing/local-plan-override.ts` (DEV only).

## Scoped guidelines — read before touching

- **Pricing phases (server side)** — `apps/server/CLAUDE.md`: `appliedAt` idempotency, lazy apply-on-read via `applyDuePhases`, and `db.batch` over `db.transaction`.
- **Pricing phases (pure logic)** — `packages/pricing/CLAUDE.md`: phase-kind semantics, half-open windows, due-phase ordering, the `customDate` mode literal, TZDate offset strings.
- **Spend / occurrences** — `packages/spend/CLAUDE.md`: anchored recurrence, timezone threading, cancellation gating, per-occurrence amount resolution.
- **Currency** — `packages/currency/CLAUDE.md`: the rate-table contract and its degradation rules.

> **v4 migration in progress.** `apps/client` does not type-check and is deleted in Plan 8 — that is intended. Verify with the scoped commands below, never the root `bun run type-check`.

## Quality gates by scope

- Client: `bun run --cwd apps/client type-check` → `bun run --cwd apps/client test` (+ `bun run react-doctor` for React changes).
- Server: `bun run --cwd apps/server type-check` → `bun run --cwd apps/server test`.
- Cross-cutting / boundaries: `bun run type-check` → `bun run test` → `bun run check:boundaries` → `bun run check:circular`.
