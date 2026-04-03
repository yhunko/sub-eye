# SubEye

**Track, analyze, and tame your recurring subscriptions.**

SubEye is an open-source subscription management app. Add your subscriptions, get renewal alerts via push notifications or Telegram, visualize your monthly spend, and use the AI-powered comparator to make smarter billing decisions.

**Live app → [app.subeye.cc](https://app.subeye.cc)**

---

## Features

- **Dashboard** — monthly spend, cash flow chart, upcoming renewals, category breakdown, and yearly totals at a glance
- **Subscription tracking** — name, cost, currency, billing period, payment date, notes, auto-pay flag, and cancellation scheduling
- **Renewal notifications** — web push and Telegram bot alerts with configurable lead time
- **Comparator** — side-by-side subscription comparison with AI insights (Google Gemini)
- **Categories** — custom categories with AI-assisted auto-categorization
- **Price change scheduling** — track future price increases before they hit
- **Family / team spaces** — shared subscriptions and analytics for groups
- **i18n** — English and Ukrainian (`uk`) out of the box; base locale is Ukrainian, English served alongside

### Plans

|                     | Free | Plus      | Family    |
| ------------------- | ---- | --------- | --------- |
| Subscriptions       | 20   | 50        | Unlimited |
| Categories          | 20   | Unlimited | Unlimited |
| Comparisons / month | 10   | Unlimited | Unlimited |
| AI insights / month | 10   | 300       | 300       |
| Telegram templates  | —    | Yes       | Yes       |
| Group sharing       | —    | —         | Yes       |

---

## Stack

Built on the [bhvr](https://github.com/stevedylandev/bhvr) monorepo template.

| Layer           | Technology                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Runtime         | [Bun](https://bun.sh)                                                                                       |
| Frontend        | [React 19](https://react.dev) + [Vite](https://vitejs.dev) + [TanStack Router](https://tanstack.com/router) |
| Backend         | [Hono](https://hono.dev) deployed as a [Cloudflare Worker](https://workers.cloudflare.com)                  |
| Database        | [Neon](https://neon.tech) PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)                              |
| Auth            | [Clerk](https://clerk.com)                                                                                  |
| Billing         | [Paddle](https://paddle.com)                                                                                |
| Async workflows | [Upstash QStash](https://upstash.com/docs/qstash)                                                           |
| AI              | [Google Gemini](https://ai.google.dev)                                                                      |
| Notifications   | Web Push + [Telegram Bot API](https://core.telegram.org/bots/api)                                           |
| i18n            | [Paraglide](https://inlang.com/m/gerre34r) (inlang)                                                         |
| Monorepo        | [Turbo](https://turbo.build)                                                                                |

Three workspaces: `client/` (React PWA), `server/` (Hono Worker), `shared/` (types, schemas, utilities).

---

## Getting started

```bash
# Install all workspace dependencies
bun install

# Start client + server concurrently
bun run dev

# Or individually
bun run dev:client   # Vite dev server
bun run dev:server   # Hono server (watch mode)
```

### Environment variables

Copy the `.env.example` files in `client/` and `server/` and fill in your keys for Clerk, Neon, Paddle, Upstash, Gemini, and Telegram.

### Database

```bash
bun --cwd server run db:generate   # generate migration SQL
bun --cwd server run db:migrate    # apply pending migrations
```

### i18n (required before first type-check)

```bash
bun --cwd client run prepare   # compile Paraglide messages → src/shared/lib/i18n/
```

### Quality checks

```bash
bun run lint          # Biome check across the repo
bun run lint:fix      # Biome check with safe writes
bun run format        # Biome formatter
bun run type-check    # TypeScript across all workspaces
bun run test          # Tests across all workspaces
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
