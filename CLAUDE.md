# SubEye

Subscription-management SaaS. **Bun** monorepo, orchestrated by **Turbo**.

- `apps/client` (`@subeye/client`) — React 19 + Vite PWA, **Feature-Sliced Design**.
- `apps/server` (`@subeye/server`) — **Hono** API deployed as a **single Cloudflare Worker** that serves both the API and the built client assets.
- `packages/*` — scoped `@subeye/*` libraries, separated **by concern**, consumed as **source** (see below).

**External services:** Clerk (auth — JWT per request, Svix webhooks for `user.deleted`) · Neon Postgres + Drizzle (`apps/server/src/db/schema.ts`) · Paddle (billing webhooks → `billing_accounts`) · Upstash QStash (scheduled renewal/expiry/price-change workflows) · Google Gemini (AI) · Web Push + Telegram (notifications).

## Packages — source-only, by concern

| Package | Responsibility |
| --- | --- |
| `@subeye/shared` | Environment-agnostic contracts: types, Valibot schemas, enums, pure utils. Used by client **and** server. |
| `@subeye/scheduling` | QStash adapter — `serve` (re-exported unchanged), `triggerWorkflow`, `cancelWorkflow`. |
| `@subeye/notifications` | Transport only: `./push` (web-push) + `./telegram` (Bot API). |
| `@subeye/ai` | Gemini `generateContent` client + `normalizeModelJson`. |

**Source-only packaging (DX rule):** every package's `exports` points at `./src/index.ts` — **no `dist`, no build step, no `postinstall`**. Wrangler/esbuild and Vite compile package TS source directly. Edit source and it's live; never add a build step or import a `dist/` path. The root `tsconfig.json` is flat (no path aliases / project references).

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
- **Server:** validate every payload at the route with `@hono/valibot-validator`. `protect`/`clerkAuth` on authenticated routes; never re-derive identity in services. Webhook routes (`/api/webhooks/**`) skip auth and verify Svix/Paddle signatures. QStash workflows are triggered from services, not routes. Services accept an optional `deps` param (defaults to real impls) for testability. File names `camelCase` (modules) / `kebab-case` (route resources). DB identifiers `snake_case`.
- **Billing usage:** `GET /api/billing/usage` (`BillingService.getUsage`) + client `billingQueryKeys.usage` are the **single source of truth** for plan/quota data. Do not add parallel usage endpoints or keys.

## Gotchas

- **CF Worker `process.env` is `undefined` at module load** — read secrets/vars per-request via `context.env`. (Known exception: `apps/server/src/index.ts` reads `process.env.CLIENT_ORIGIN` at module scope; it works under `nodejs_compat` and is intentionally left as-is.)
- **Neon `neon-http` driver has no interactive transactions** — `db.transaction()` throws, so the category optimization/delete paths apply their writes as plain sequential statements. Don't assume multi-statement atomicity (use `db.batch([...])` if you need an atomic group).
- **Hono RPC leaks error shapes into the client success type.** In route error handlers cast status to narrow literals (`400 | 403 | 404`), never `ContentfulStatusCode`/`StatusCode`.
- Returning 204 from middleware: use `new Response("", { status: 204 })`. Inline `.use()` middleware that can return `next()` **or** a `Response` must be `async`.
- **Generated — never hand-edit:** `apps/client/src/app/routes/routeTree.gen.ts` (TanStack Router), `apps/client/src/shared/lib/i18n/**` (Paraglide). Edit source + rerun the generator.
- Dev Plus-plan simulation: `apps/client/src/shared/lib/billing/local-plan-override.ts` (DEV only).

## Pricing phases — read before touching

`apps/server/CLAUDE.md` documents the pricing-phase invariants (`appliedAt` idempotency, lazy apply-on-read, `db.batch` over `db.transaction`). Read it before editing any phase or subscription-pricing code.

> **v4 migration in progress.** Plan 1 deleted the server's comparator/category AI, QStash workflows, Telegram, Web Push, Paddle billing and organizations, along with `packages/{ai,notifications,scheduling}`. The **External services** and **Packages** sections above still describe the pre-v4 shape and are corrected in Plan 8, together with the removal of `apps/client`. `apps/client` does not type-check until then — that is intended.

## Quality gates by scope

- Client: `bun run --cwd apps/client type-check` → `bun run --cwd apps/client test` (+ `bun run react-doctor` for React changes).
- Server: `bun run --cwd apps/server type-check` → `bun run --cwd apps/server test`.
- Cross-cutting / boundaries: `bun run type-check` → `bun run test` → `bun run check:boundaries` → `bun run check:circular`.
