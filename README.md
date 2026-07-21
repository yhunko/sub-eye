# SubEye

**Track, analyze, and tame your recurring subscriptions.**

SubEye is an open-source subscription tracker. Add your subscriptions, see what
they cost you per month and per year, schedule price changes before they hit,
and pause or cancel without losing the history.

The client is a native iOS/Android app (Expo). The API runs as a single
Cloudflare Worker at `app.subeye.cc`.

---

## Features

- **Dashboard** — yearly forecast, monthly burn rate, remaining spend this month, upcoming renewals and a category breakdown
- **Subscription tracking** — name, cost, currency, billing period, payment date, notes, auto-pay flag and category
- **Pricing phases** — trials, intro/promo pricing and scheduled price changes on one timeline, applied automatically when the boundary passes
- **Lifecycle** — pause until a date, cancel at period end or immediately, and renew; the app only offers the actions the server says are legal
- **Multi-currency** — amounts normalized through a daily-refreshed FX rate table
- **Reminders** — device-local notifications, no server scheduler
- **i18n** — English and Ukrainian, via Paraglide

---

## Stack

| Layer     | Technology                                                                              |
| --------- | --------------------------------------------------------------------------------------- |
| Runtime   | [Bun](https://bun.sh)                                                                   |
| Client    | [React Native](https://reactnative.dev) + [Expo](https://expo.dev) (expo-router)         |
| Backend   | [Hono](https://hono.dev) deployed as a [Cloudflare Worker](https://workers.cloudflare.com) |
| Database  | [Neon](https://neon.tech) PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)           |
| Auth      | [Clerk](https://clerk.com)                                                              |
| i18n      | [Paraglide](https://inlang.com/m/gerre34r) (inlang)                                     |
| Monorepo  | [Turbo](https://turbo.build)                                                            |

Two apps — `apps/mobile` (Expo) and `apps/server` (Hono Worker) — over four
source-only packages: `@subeye/shared` (contracts), `@subeye/pricing` (phase
model), `@subeye/spend` (occurrence engine) and `@subeye/currency` (rate table).

A React 19 + Vite PWA was the client through v3. It was retired in v4 and is
recoverable at the git tag `web-final`.

---

## Getting started

```bash
# Install all workspace dependencies
bun install

# Server (watch mode)
bun run dev:server

# Mobile — builds the typed API client, then starts Expo
bun run dev:mobile
```

The mobile app needs a native dev client (`bun run --cwd apps/mobile ios`)
because it uses native modules; a Metro reload is not enough after adding one.

### Environment variables

`apps/server` reads seven bindings, declared in `apps/server/src/env.ts`:
`BASE_URL`, `CLIENT_ORIGIN`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
`CLERK_WEBHOOK_SECRET`, `DATABASE_URL` and `POSTHOG_KEY`. Validate them with
`bun run --cwd apps/server check-env`.

### Database

```bash
bun run --cwd apps/server db:generate   # generate migration SQL
bun run --cwd apps/server db:migrate    # apply pending migrations
```

### Quality checks

```bash
bun run lint              # Biome check across the repo
bun run lint:fix          # Biome check with safe writes
bun run format            # Biome formatter
bun run type-check        # TypeScript across all workspaces
bun run test              # Tests across all workspaces
bun run check:boundaries  # dependency-cruiser: package + FSD + layer rules
bun run check:circular    # madge
```

### Deploy

```bash
bun run deploy:dev    # build + wrangler deploy to dev.subeye.cc
```

---

## License

MIT — see [LICENSE](./LICENSE).

---

Built on [bhvr](https://github.com/stevedylandev/bhvr) by [Steve Simkins](https://github.com/stevedylandev).
