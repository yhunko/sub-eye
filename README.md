# SubEye

Subscription tracking — see every recurring charge, what it costs you per month,
and what is coming up.

A native SwiftUI iPhone app with a Home Screen widget and renewal Live
Activities, plus an [Astro](https://astro.build) marketing site, in one
[Bun](https://bun.sh) + [Turborepo](https://turborepo.dev) monorepo.

SubEye runs entirely on the phone. There is no API, no database and no account:
everything you enter is stored in SQLite on the device, and the app works with
the network off. Optional iCloud sync uses Apple's key-value store.

## Workspaces

| Package | What it is |
| --- | --- |
| [`apps/ios`](apps/ios) | The app. SwiftUI, iOS 16.4+; widget and Live Activities on iOS 17+ |
| [`apps/landing`](apps/landing) | [subeye.cc](https://www.subeye.cc) — Astro, static, zero client JS |
| `packages/legal` | The privacy policy and terms of service as data, en + uk — the app and the site render the same words |
| `packages/model` | The period, status and price-phase types |
| `packages/money` | Currency codes, rate tables, conversion |
| `packages/pricing` | Pricing-phase model — trials, intro discounts, scheduled price changes |

The TypeScript packages export source directly, with no build step. The app's
own domain logic lives in Swift, in `apps/ios/SubEyeCore`.

## Getting started

See [apps/ios/README.md](apps/ios/README.md) for building the app.

```sh
bun install
bun run --cwd apps/landing dev   # astro dev on :4321
```

## Quality gates

```sh
swift test --package-path apps/ios/SubEyeCore
bun run type-check
bun run test              # bun:test
bun run lint              # biome
bun run check:boundaries  # dependency-cruiser — package layering and cycles
```

GitHub Actions runs the TypeScript gates on every push to `dev`/`main` and every
pull request, and `swift test` whenever `apps/ios/SubEyeCore` changes.

## Releases

CI neither releases nor deploys. The app's version is `MARKETING_VERSION` in
`apps/ios/project.yml`; it ships as a local IPA (`bun run build:ios`) uploaded
with Transporter, and the landing site with `bun run --cwd apps/landing deploy`.

## Contributing

`CLAUDE.md` at the repo root and in each workspace documents the invariants and
gotchas for that area — worth reading before a first change, human or agent.

## License

MIT — see [LICENSE](LICENSE).
