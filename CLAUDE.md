# sub-eye

Subscription tracking. Bun + Turbo monorepo: a Hono API on Cloudflare Workers,
an Expo mobile client, and a static marketing site, over seven pure packages
and one that owns storage.

```
apps/server       Hono API — Cloudflare Worker, Neon Postgres via Drizzle, Clerk auth
apps/mobile       Expo (React Native, expo-router) — the only client
apps/landing      subeye.cc — Astro 6, static, zero client JS, en + uk
packages/model    records, DTOs, valibot schemas — consumed by everything
packages/time     UTC calendar days and recurrence. A leaf — imports nothing.
packages/money    currency codes, rate tables, conversion, FX document parsing
packages/lifecycle status derivation, allowed actions, pure cancel/renew/pause/resume
packages/pricing  pure phase model (trial/intro/scheduledChange/standard)
packages/spend    pure occurrence engine (payment projection, aggregates)
packages/reminders what to remind about and when — copy injected, no OS types
packages/store     storage ports + use-cases — the only package that does IO
```

Each of `apps/*` and
`packages/model|time|money|lifecycle|pricing|spend|reminders|store` has its own
`CLAUDE.md` with the invariants for that area. Read the one you are
touching — those carry the rules that actually bite.

## Commands

```bash
bun install
bun run dev:server        # wrangler dev
bun run dev:mobile        # build server types, then Metro
bun run dev:lan           # server on 0.0.0.0:8788 for on-device testing
bun run --cwd apps/landing dev   # astro dev on :4321
```

```bash
bun run type-check        # turbo, every workspace
bun run test              # turbo — bun:test everywhere, there is no vitest
bun run lint              # biome (not eslint, not prettier)
bun run check:boundaries  # dependency-cruiser — layer + leaf rules
bun run check:circular    # madge
```

Run `type-check`, `test`, and `check:boundaries` before calling work done.
`bun run lint:fix` and `bun run format` write.

**Never run `expo` from the repo root** — always `--cwd apps/mobile`, or `cd`
into it. The Expo CLI resolves a "project" from the nearest `package.json` and
will happily adopt the monorepo root: `expo prebuild` there writes an
`{"expo": {}}` app.json, adds `expo`/`react`/`react-native` to the ROOT
dependencies, and reformats the root `tsconfig.json`, stripping its comments.
It scaffolds silently and none of it belongs here. That stray root `app.json`
was committed once already, which is what made every later root invocation look
legitimate.

## Conventions

**Packages export source.** Every `@subeye/*` package points `exports` at
`./src/index.ts` and type-checks with `noEmit` — no build step, no `dist`. The
one exception is `@subeye/server/client`, a types-only `tsc` build that exists
solely to hand `ServerRpcType` to the mobile app; see
[apps/mobile/CLAUDE.md](apps/mobile/CLAUDE.md) for why Metro forces that.

**Boundaries are enforced, not suggested.** `dependency-cruiser.cjs` fails the
build on: a package importing from `apps/` (`no-package-to-app`), a server
repository importing a service (`server-repository-is-leaf`), a mobile FSD
layer importing upward, `src/features/` appearing in mobile, and any cycle.
If a rule blocks you, the design is wrong — do not add an exception.

**Purity in packages.** `pricing`, `spend`, and `currency` take `now` as a
parameter and never touch `db`, `fetch`, or a clock. A pure function reports a
caller error by returning `null`; the server converts that into a domain error.

**Commits are conventional** — commitlint gates them and semantic-release reads
them to cut versions.

**`.astro` files are not linted by Biome.** Biome sees an Astro file's
frontmatter but not its template, so every variable the markup renders looks
unused. They are excluded in `biome.jsonc`; `apps/landing` runs `astro check` as
its `type-check` and enables `noUnusedLocals` to cover the gap. Adding a new
file type to a workspace also means adding its glob to `turbo.json` — the input
lists are explicit, and a missing glob silently replays a stale cached build.

**The production release builds the server only**
(`turbo build --filter=@subeye/server`). A broken marketing page must not be
able to block an API deploy; `apps/landing` ships separately to Cloudflare.

## Comments

Comment only what the code cannot say: a quirk, a trap, a non-obvious edge
case, or a decision whose rationale is invisible at the call site.

Never write a comment that restates the line below it, a section banner, a
docstring on a self-evident function, or a note about what you just changed —
that is what the commit message is for. Prose describing obvious code is noise
the next reader has to re-verify against reality, and it rots silently.

The bar, both from this repo:

- [packages/money/src/rateTable.ts](packages/money/src/rateTable.ts) —
  warns that converting *into* the base currency is a division. Earns its place.
- [apps/server/test/phase-apply-now-closes-timeline.test.ts](apps/server/test/phase-apply-now-closes-timeline.test.ts)
  — each assertion names the failure mode it prevents.

Neither restates code. Both would cost someone an hour if deleted.

## Money

Pricing and spend decide what a user is charged and when, so a bug there is
silently wrong money rather than a crash. A change to phase logic, occurrence
projection, or currency conversion needs a test that fails without it.
