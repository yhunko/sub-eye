# SubEye

Subscription tracking — see every recurring charge, what it costs you per month,
and what is coming up.

A [Bun](https://bun.sh) + [Turborepo](https://turborepo.dev) monorepo: a
[Hono](https://hono.dev) API deployed as a single
[Cloudflare Worker](https://workers.cloudflare.com), and an
[Expo](https://expo.dev) (React Native) mobile client.

## Workspaces

| Package | What it is |
| --- | --- |
| [`apps/server`](apps/server) | The API. Hono on Cloudflare Workers, Neon Postgres via Drizzle, Clerk auth. [Details](apps/server/README.md) |
| [`apps/mobile`](apps/mobile) | The client. Expo + expo-router, iOS and Android |
| `packages/shared` | Schemas, DTOs and domain utils shared by every workspace |
| `packages/pricing` | Pure pricing-phase model — trials, intro discounts, scheduled price changes |
| `packages/spend` | Pure occurrence engine — payment projection and spend aggregates |
| `packages/currency` | The `RateTable` type |

Packages export TypeScript source directly (no build step). The lone exception
is `@subeye/server/client`, a types-only build that gives the mobile app its
typed Hono RPC client.

## Getting started

```sh
bun install
```

```sh
bun run dev:server   # API via wrangler dev
bun run dev:mobile   # build server types, then start Metro
```

The API needs seven environment bindings and the mobile app needs
`EXPO_PUBLIC_*` vars — both validate at startup and fail loudly. See
[apps/server/README.md](apps/server/README.md) for the server list.

Testing on a physical device needs the API reachable from the phone, not
`localhost`:

```sh
bun run dev:lan      # binds 0.0.0.0:8788
```

Point `EXPO_PUBLIC_API_URL` at your machine's LAN IP.

## Quality gates

```sh
bun run type-check
bun run test              # bun:test
bun run lint              # biome
bun run check:boundaries  # dependency-cruiser — architectural layer rules
bun run check:circular    # madge
```

Architectural boundaries are enforced in CI, not documented and hoped for:
packages may not import from `apps/`, server repositories may not import
services, and mobile FSD layers may not import upward.

## Releases

Conventional commits, automated by
[semantic-release](https://semantic-release.gitbook.io). `bun run deploy:dev`
builds and deploys the Worker to the dev environment; production releases run
from GitHub Actions.

## Contributing

`CLAUDE.md` at the repo root and in each workspace documents the invariants and
gotchas for that area — worth reading before a first change, human or agent.

## License

MIT — see [LICENSE](LICENSE).
