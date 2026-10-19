# sub-eye

Subscription tracking. A native SwiftUI iOS app (the only client — the Expo app
is retired) and a static marketing site, in a Bun + Turbo monorepo with a few
TypeScript packages the site and the app's bundled documents draw on.

**There is no server, no database and no account.** Everything lives on the
device in SQLite. The only network calls are RevenueCat, Brandfetch, Google
favicons and the daily FX document from jsDelivr.

The one exception is **iCloud key-value sync**, off by default and the only path
that ever sends a user's own data anywhere. It is Apple's transport — still no
server and no account — and it is a switch in Settings → Data because "it stays
on your phone" is a promise the landing page makes.

```
apps/ios           SwiftUI app, widget and Live Activity; SubEyeCore holds the domain rules and the SQLite store
apps/landing       subeye.cc — Astro 6, static, zero client JS, en + uk
packages/legal     the privacy policy and terms as data — the app and the site render the same words
packages/model     the period, status and price-phase types
packages/money     currency codes, rate tables, conversion
packages/pricing   pure phase model (trial/intro/scheduledChange/standard) behind the site's price mockup
```

Every workspace has its own `CLAUDE.md` with the invariants for that area. Read
the one you are touching — those carry the rules that actually bite.

## Commands

```bash
bun run type-check        # turbo, every workspace
bun run test              # turbo — bun:test everywhere, there is no vitest
bun run lint              # biome (not eslint, not prettier)
bun run check:boundaries  # dependency-cruiser — package layering
bun run check:circular    # madge
```

Run `type-check`, `test`, and `check:boundaries` before calling work done; iOS
work adds the checks in `apps/ios/CLAUDE.md`. `bun run lint:fix` and
`bun run format` write.

## Conventions

**Packages export source.** Every `@subeye/*` package points `exports` at
`./src/index.ts` and type-checks with `noEmit` — no build step, no `dist`.

**Boundaries are enforced, not suggested.** `dependency-cruiser.cjs` fails the
build on a package importing from `apps/`, any edge out of `legal`, and
`money`/`model` importing `pricing`. If a rule blocks you, the design is
wrong — do not add an exception. The rules match the `@subeye/…` specifier
string, not a resolved path — the root `tsconfig.json` declares no `paths`, so a
rule written against `^packages/…` in its `to` clause silently matches nothing.
Probe any new rule by breaking it once.

**Purity in packages.** Every package takes `now` as a parameter and never
touches `db`, `fetch`, or a clock; a caller error is a `null` return.

**Commits are conventional** — commitlint gates them and semantic-release reads
them to cut versions.

**`.astro` files are not linted by Biome** — it sees the frontmatter but not the
template, so rendered variables look unused. `apps/landing` runs `astro check`
with `noUnusedLocals` instead. A new file type in a workspace also needs its glob
in `turbo.json`; a missing glob silently replays a stale cached build.

**CI releases, it does not deploy.** Workflows run the quality gate and
semantic-release, then stop. `apps/landing` deploys with
`bun run --cwd apps/landing deploy`; the app ships as a local IPA
(`bun run build:ios`) uploaded with Transporter.

## Comments

Comment only what the code cannot say: a quirk, a trap, a non-obvious edge case,
or a decision whose rationale is invisible at the call site. Never restate the
code, add banners or docstrings on self-evident functions, or narrate a change —
that is the commit message's job.

## Money

Pricing and spend decide what a user is charged and when, so a bug there is
silently wrong money rather than a crash. A change to phase logic, occurrence
projection, or currency conversion needs a test that fails without it.
