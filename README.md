# SubEye

Subscription tracking — see every recurring charge, what it costs you per month,
and what is coming up.

A [Bun](https://bun.sh) + [Turborepo](https://turborepo.dev) monorepo: an
[Expo](https://expo.dev) (React Native) mobile client and an
[Astro](https://astro.build) marketing site.

SubEye runs entirely on the phone. There is no API, no database and no account:
everything you enter is stored in MMKV on the device, and the app works with the
network off.

## Workspaces

| Package | What it is |
| --- | --- |
| [`apps/mobile`](apps/mobile) | The app. Expo + expo-router, iOS |
| [`apps/landing`](apps/landing) | [subeye.cc](https://www.subeye.cc) — Astro, static, zero client JS |
| `packages/model` | Records, DTOs and valibot schemas shared by every workspace |
| `packages/time` | UTC calendar days and recurrence. A leaf — imports nothing |
| `packages/money` | Currency codes, rate tables, conversion, FX document parsing |
| `packages/lifecycle` | Status derivation, allowed actions, pure cancel/renew/pause/resume |
| `packages/pricing` | Pure pricing-phase model — trials, intro discounts, scheduled price changes |
| `packages/spend` | Pure occurrence engine — payment projection and spend aggregates |
| `packages/reminders` | What to remind about and when — copy injected, no OS types |
| `packages/store` | Storage ports and use-cases — the only package that does IO |

Packages export TypeScript source directly, with no build step.

## Getting started

```sh
bun install
```

```sh
bun run dev:mobile               # Metro
bun run --cwd apps/landing dev   # astro dev on :4321
```

The mobile app needs its `EXPO_PUBLIC_*` vars, which validate at startup and
fail loudly — see [apps/mobile/CLAUDE.md](apps/mobile/CLAUDE.md).

## Quality gates

```sh
bun run type-check
bun run test              # bun:test
bun run lint              # biome
bun run check:boundaries  # dependency-cruiser — architectural layer rules
bun run check:circular    # madge
```

Architectural boundaries are enforced in CI, not documented and hoped for:
packages may not import from `apps/`, the package layering is one-directional,
and mobile FSD layers may not import upward.

## Releases

Conventional commits, automated by
[semantic-release](https://semantic-release.gitbook.io) from GitHub Actions.
CI releases but does not deploy: the app ships through EAS and the landing site
with `bun run --cwd apps/landing deploy`.

## Contributing

`CLAUDE.md` at the repo root and in each workspace documents the invariants and
gotchas for that area — worth reading before a first change, human or agent.

## License

MIT — see [LICENSE](LICENSE).
