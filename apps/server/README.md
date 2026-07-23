## Server

`@subeye/server` — the SubEye API. [Hono](https://hono.dev) deployed as a single
[Cloudflare Worker](https://workers.cloudflare.com). It is API-only and serves no
static assets. Persistence is [Neon](https://neon.tech) Postgres via Drizzle; auth
is [Clerk](https://clerk.com) (JWT per request, Svix webhooks).

Install dependencies:

```sh
bun install
```

Run the server in development (watch mode):

```sh
bun run dev
```

The API runs on http://localhost:3000 under the `/api` base path.

### API surface

Routers mounted in `src/index.ts` (all under `/api`):

- `/subscriptions` — subscription CRUD, lifecycle (pause/cancel/renew) and pricing phases
- `/categories` — category CRUD
- `/analytics` — dashboard stats, monthly-spend and weekly-renewals summaries
- `/user` — user preferences
- `/webhooks` — Clerk Svix webhooks (`user.deleted`); skips auth, verifies signatures

The mobile app consumes these via the typed Hono RPC client exported at
`@subeye/server/client` (built by `bun run build`).

The Worker also runs a `scheduled` cron export that refreshes the `fx_rates`
table daily (`src/domains/currency/currencyService.ts`).

### Required environment variables

Seven bindings, declared and validated in `src/env.ts`:

- `BASE_URL`
- `CLIENT_ORIGIN`
- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_WEBHOOK_SECRET`
- `POSTHOG_KEY`

Validate the local environment against the schema with:

```sh
bun run --cwd apps/server check-env
```

### Database (Drizzle + Neon)

```sh
bun run --cwd apps/server db:generate   # generate migration SQL from schema.ts
bun run --cwd apps/server db:migrate    # apply pending migrations
bun run --cwd apps/server db:push       # push schema directly (dev only)
```

### Quality commands

```sh
bun run --cwd apps/server type-check
bun run --cwd apps/server test
```
