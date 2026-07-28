# @subeye/landing — the marketing site and the legal pages

Astro 6, `output: 'static'`, no UI framework, no CSS framework, **zero client
JavaScript**. Six pages: a marketing page and two legal pages, in English and
Ukrainian. Deployed to Cloudflare Workers static assets.

The look comes from the **Claude Design project** "SubEye Landing"
(`88fdacd0-c5e2-4f38-a3df-9c5df7f631df`) and its design system — dark-only, one
green ramp, 24px cards, Nunito. That supersedes `docs/landing/DESIGN-BRIEF.md`
for anything visual; the brief still owns the voice, the feature claims and the
"never imply these" list. `docs/landing/SETUP-BRIEF.md` owns the engineering
constraints. Read both before changing markup or copy.

## The four URLs are a contract with a shipped binary

```
https://www.subeye.cc/en/terms-of-service/
https://www.subeye.cc/en/privacy-policy/
https://www.subeye.cc/uk/terms-of-service/
https://www.subeye.cc/uk/privacy-policy/
```

`apps/mobile/src/shared/config/legal-url.ts` builds exactly these and pins them
in its own test. **App Store Connect rejects a 404 privacy policy**, and
Settings → Legal opens them in front of a reviewer. Three things produce them
and all three must agree:

| where | what |
| --- | --- |
| `astro.config.mjs` | `i18n.routing.prefixDefaultLocale: true` — this is what makes English `/en/` instead of the bare root |
| `astro.config.mjs` | `trailingSlash: "always"` + `build.format: "directory"` |
| `wrangler.jsonc` | `assets.html_handling: "force-trailing-slash"` |

`test/routes.test.ts` asserts all of it against the page files that exist. If it
fails, do not "fix" the test — a scheme change costs a new App Store build.

## Zero client JavaScript, and it has to stay zero

The budget is under 5 KB on any route and the current figure is **0**. The only
`<script>` in the output is the JSON-LD data block, which browsers never
execute. Everything interactive is a platform feature:

- The FAQ is `<details>`/`<summary>`. It animates on `::details-content` as a
  grid row `0fr → 1fr`, with `content-visibility` transitioned
  `allow-discrete` so the closing frame is not skipped. The answer needs
  `min-height: 0` **and** `overflow: hidden` or a grid item's automatic minimum
  size holds the collapsed row open. Browsers without `::details-content` open
  instantly; nothing is polyfilled.
- The price timeline is a radio group. `<label>` wraps the input, `:has()`
  moves the rail fill, and the phase the model reports as live is the one
  rendered `checked`.
- The fixed top bar reveals itself with `animation-timeline: scroll(root
  block)` inside `@supports`. Where that is unsupported the bar just starts
  visible, and `Home.astro` drops the hero's duplicate brand row to match —
  the page always shows exactly one.
- The language switch is an `<a>`.

If something seems to need an island, it does not. There is no framework
installed to reach for.

## Numbers come from the product, not from markup

The page's argument is that SubEye models a price over time, so the price
timeline's figures are computed at build time by `@subeye/pricing` itself
(`src/lib/timeline.ts`), and the currency mockup converts through the shipped
`CurrencyUtils` (`src/lib/currencies.ts`). Both are pure and take `now` as a
parameter, so they cost the visitor nothing. `src/lib/timeline.ts` **throws at
build time** if the phase model stops returning three ordered phases with the
trial live — a page that lies about the product must not ship.

Likewise the lifecycle mockup maps `subscriptionStatuses` from `@subeye/shared`,
and both copy dictionaries type their status labels as
`Record<SubscriptionStatus, string>`. A new status fails `astro check` rather
than rendering a gap.

`test/pricing.test.ts` pins the five currency codes against
`apps/mobile/src/shared/lib/format/money.ts` — deliberately, and only from a
test. The page says "five currencies" out loud; a sixth in the app should fail
here.

## Typography: one face

**Nunito**, 400–800, and nothing else. There is no mono: Nunito's digits are
already equal-width, so `.num` only sets `font-variant-numeric: tabular-nums`
and amounts stay in the same face as everything around them. Do not reintroduce
a second family for numbers.

Fonts are vendored into `public/fonts/` by `bun run --cwd apps/landing fonts`
and committed. **Nothing may reference a third-party origin at runtime** — no
CDN, no Google Fonts, no analytics. That is a Lighthouse requirement and it is
also the page's own argument.

The hryvnia lives in the `latin-ext` subset, which every locale loads, so both
pages render it. `src/lib/format.ts` still trails the symbol for UAH and PLN
("199 ₴") — that is the local convention, not a font workaround.

## Biome does not lint `.astro`

Biome parses an `.astro` file's frontmatter but not its template, so every
variable the markup renders reads as unused. `.astro` is therefore excluded
repo-wide in `biome.jsonc`, and this workspace's `tsconfig.json` turns on
`noUnusedLocals` so `astro check` — which reads both halves — keeps the one rule
worth having. `type-check` **is** `astro check`; it is not optional here.

## Two traps outside this directory

1. **`turbo.json` had no `.astro` in its input globs.** They are there now
   (`build`, `dev`, `type-check`, `test`). Adding a new file type without adding
   its glob means Turbo replays a stale cached build after you edit a page.
2. **The production release workflow builds the server only**
   (`turbo build --filter=@subeye/server`). A marketing-site typo must never be
   able to block an API deploy. The repo-wide quality gate still runs first, on
   purpose — a landing type error should fail CI, just not between the database
   migration and the Worker deploy.

## Commands

```bash
bun run --cwd apps/landing dev          # astro dev on :4321
bun run --cwd apps/landing build
bun run --cwd apps/landing type-check   # astro check — covers .astro and test/
bun run --cwd apps/landing test         # bun:test, there is no vitest
bun run --cwd apps/landing fonts        # re-vendor the woff2 subsets
python3 apps/landing/scripts/build-og.py  # re-render the OG cards (macOS only)
bun run --cwd apps/landing deploy       # wrangler deploy
```

## Deploying

An assets-only Worker — `wrangler.jsonc` has no `main`. Security headers live in
`public/_headers` and the `/` → `/en/` 308 in `public/_redirects`; Astro copies
both into `dist/` and the Workers asset runtime reads them from there. The same
two files work unchanged on Cloudflare Pages.

Two things cannot be expressed here and have to be done in the Cloudflare
dashboard: pointing `www.subeye.cc` at this Worker (it resolves to Vercel
today), and an apex `subeye.cc` → `www` Redirect Rule. The app only ever asks
for `www`.
