# @subeye/landing — the marketing site and the legal pages

Astro, `output: 'static'`, no UI framework, no CSS framework, **zero client
JavaScript**. In English and Ukrainian: the home page, two legal pages, the
support page, and two content pages — a dated Bobby comparison and the 2026
price-rise log. Deployed to Cloudflare Workers static assets.

The look was redesigned on 2026-11-05 with the `design-taste-frontend` skill,
after nutly.cc: dark-only like the app, the app's own ink and green, rounded
cards, real app screens in phone frames, Fixel. It no longer follows the Claude
Design project "SubEye Landing". `docs/landing/DESIGN-BRIEF.md` still owns the
voice, the feature claims and the "never imply these" list;
`docs/landing/SETUP-BRIEF.md` owns the engineering constraints. Read both before
changing markup or copy.

**The price timeline is Pro, and the page says so** wherever it shows one (the
hero's price line, the timeline section, the FAQ, the Pro plan). The free tier's
claim is "every subscription, no limit".

## The four URLs are a contract with a shipped binary

```
https://subeye.yhunko.dev/en/terms-of-service/
https://subeye.yhunko.dev/en/privacy-policy/
https://subeye.yhunko.dev/uk/terms-of-service/
https://subeye.yhunko.dev/uk/privacy-policy/
```

**App Store Connect rejects a 404 privacy policy**, so these four have to
resolve even though the app itself no longer opens them: since `@subeye/legal`,
Settings → Legal and the paywall render the documents in a native sheet from the
shipped bundle. The URLs are metadata now — a reviewer follows them, a binary
does not. Three things produce them and all three must agree:

| where | what |
| --- | --- |
| `astro.config.mjs` | `i18n.routing.prefixDefaultLocale: true` — this is what makes English `/en/` instead of the bare root |
| `astro.config.mjs` | `trailingSlash: "always"` + `build.format: "directory"` |
| `wrangler.jsonc` | `assets.html_handling: "force-trailing-slash"` |

`test/routes.test.ts` asserts all of it against the page files that exist. If it
fails, do not "fix" the test — a scheme change costs a new App Store build.

## The legal pages own no copy

Both documents live in [`@subeye/legal`](../../packages/legal) as data, and the
four `.astro` pages are ten lines each: fetch the doc, hand it to
`components/LegalBody.astro`, which maps blocks onto the `h2`/`p`/`ul`/`dl`/
`strong`/`code` tags `layouts/Legal.astro` already styles. `apps/ios` bundles
the same object (`apps/ios/Contracts/resources.ts`), so **editing the words here is
impossible by design** — change them in the package or the app and the site say
different things to the same user.

Two things follow. `Legal.astro`'s `updated` prop is optional and comes off the
document, so the support page — which shares the layout but is not a revised
document — no longer prints a date. And the layout formats that date with
`timeZone: "UTC"`, because an ISO day parses to UTC midnight and a build machine
west of UTC would otherwise print the day before, only on that machine.

`privacyEmail` and `operator` moved into the package as `LEGAL_CONTACT_EMAIL`
and `LEGAL_OPERATOR`; the footer and both support pages import them from there.
`proPrice` stayed in `src/lib/site.ts` — a package cannot import an app — so the
terms quote it as formatted literals and `test/pricing.test.ts` pins the two
against each other.

## One third-party script, and everything else is a platform feature

The site's own JavaScript budget is still **0** — nothing here is bundled,
hoisted or hydrated, and the only other `<script>` in the output is the JSON-LD
data block, which browsers never execute.

The exception is **StartupBar**, the directory widget mounted at the top of
`Home.astro`. It is a vendor tag carried `is:inline` so Astro leaves it exactly
as pasted — `document.currentScript` is how the loader reads its startup id, and
a bundled copy would read nothing. It is the only third-party origin this site
loads at runtime, so `public/_headers` names `startupbar.co` in `script-src`,
`frame-src` **and** `img-src`: a loader, an iframe, and an image-pixel
heartbeat. Miss one directive and the bar silently never appears, with no
console error to explain it — `test/widget.test.ts` pins all three against the
tag.

It is on the two home pages only — not the legal, support or content pages. The
four legal URLs are App Store Connect metadata a reviewer opens, and a promo bar
does not belong on them.

Everything else interactive is still a platform feature:

- The FAQ is `<details>`/`<summary>`. It animates on `::details-content` as a
  grid row `0fr → 1fr`, with `content-visibility` transitioned
  `allow-discrete` so the closing frame is not skipped. The answer needs
  `min-height: 0` **and** `overflow: hidden` or a grid item's automatic minimum
  size holds the collapsed row open. Browsers without `::details-content` open
  instantly; nothing is polyfilled.
- The price timeline is a radio group. Each `<label>` is a bar whose height is
  the phase's price, `:has(:checked)` fills it, and the phase the model reports
  as live is the one rendered `checked`. Its rise on scroll is the page's one
  scroll-linked move (`animation-timeline: view()`, skipped under reduced
  motion and in browsers without scroll timelines).
- The fixed top bar is visible from the first paint, so the App Store badge is
  on screen before the reader scrolls; every page pads itself out from under
  its 4.5rem.
- Apple's Smart App Banner is a single `<meta name="apple-itunes-app">` in
  `Base.astro`. Only Safari on iPhone and iPad draws it, nothing on the page can
  style it, and a wrong id produces no banner and no error.
- The language switch is an `<a>`.

If something seems to need an island, it does not. There is no framework
installed to reach for.

## The App Store badge is licensed artwork, not an image

`public/badges/download-on-the-app-store.svg` is Apple's file, fetched from
`developer.apple.com/assets/elements/badges/` and committed byte-for-byte. It
is served from this origin because the site references no third-party host at
runtime and `img-src 'self' data:` would block one anyway.

Apple's marketing guidelines are a licence condition, not advice, and four of
them shape the markup:

- **One badge per layout** is Apple's wording; the home page deliberately
  carries three — the fixed bar, the hero and the closing card — because every
  route to the App Store here is Apple's artwork, never a green button wearing
  its words. `test/appStore.test.ts` pins exactly those placements. The other
  pages carry only the bar's.
- **Clear space** of at least a quarter of the badge height, on every side,
  with nothing in it. `AppStoreBadge.astro` carries that as its own padding so
  it survives a later change to the row's `gap`, then pulls the artwork back
  into line with the headline with a negative inline-start margin — the page
  gutter is the clear space on that side.
- **Never modify it.** No recolour, no tilt, no animation, and so no hover
  state either. 54px tall against a 40px floor.
- **Never build your own localised badge.** Apple ships a Ukrainian one, but
  only through App Store Marketing Tools, so both locales render the English
  artwork until someone downloads the real file. The *alt text* is localised;
  the words `App Store` inside it never are.

The footer's trademark credit line is required once per site wherever legal
notice is given, and has to credit the Apple logo because the badge carries
one. `test/appStore.test.ts` pins the placement count, the file's provenance,
and the marks that must stay in English in both dictionaries.

`src/lib/site.ts` drops the `/us/` storefront from the launch link on purpose —
`apps.apple.com/app/id…` lets Apple route a reader to their own store, which is
the same promise the pricing section makes out loud.

## Numbers come from the product, not from markup

The page's argument is that SubEye models a price over time, so the price
timeline's figures are computed at build time by `@subeye/pricing` itself
(`src/lib/timeline.ts`), and the currency panel converts through the shipped
`CurrencyUtils` (`src/lib/currencies.ts`). Both are pure and take `now` as a
parameter, so they cost the visitor nothing. `src/lib/timeline.ts` **throws at
build time** if the phase model stops returning three ordered phases with the
trial live — a page that lies about the product must not ship.

## The app screens are real captures

`src/assets/app/{en,uk}/*.webp` are screens of the development build
(`cc.subeye.app.native`, Debug) on an iPhone 17 Pro Max simulator, seeded with
the developer screen's **Seed portfolio** — fixture data, never anyone's own.
The Ukrainian set ran with the simulator itself in Ukrainian, the preferred
currency set to UAH, and the fixture's English category and plan names renamed
in the simulator's store. Capture the Lock Screen (the Live Activity) with
`simctl status_bar … clear`: an override dates it 1 January, drops its status
icons and adds a stray indicator. They are 720px-wide WebP sources; `AppShot.astro`
re-encodes them to AVIF and WebP at build time, and `Phone.astro` frames them.
`day.webp` is the one crop. To refresh them, capture the same screens in both
languages and keep the file names; `src/lib/shots.ts` lists them. Alt text says
"sample data", and nothing under a picture explains it — the skill forbids
captions.

## Search: structured data, share cards, sitemap

- **Structured data** is built in `src/lib/schema.ts` and handed to `Base.astro`
  as `jsonLd`. The home page is a `MobileApplication` with two offers — the free
  download (`freePrice`) and Pro at the page's storefront price — because one
  offer at the Pro price would say the app costs that. Never add a rating or
  review the page does not show. The content pages are an `Article` plus a
  `BreadcrumbList`, dated by the day their facts were read.
- **Share cards** are `public/og/{locale}.png` for every page but the two content
  pages, which have `{locale}-{page}.png`; `src/lib/og.ts` picks the file and
  takes the alt text from `og` in the dictionaries. `scripts/build-og.py`
  renders all six and `public/apple-touch-icon.png` (macOS, QuickLook) with the
  card words duplicated in the script — change both together. `test/seo.test.ts`
  fails if a page points at a card that does not exist.
- **The sitemap** (`astro.config.mjs` `serialize`) adds the `x-default`
  alternate the page heads carry, and a `lastmod` only on the two content pages,
  from their read dates. A build date on every URL is a `lastmod` search engines
  learn to ignore.
- Language links carry `.lang-link` (the system face), so an English page never
  downloads the Cyrillic subset to draw "УКР".

## The content pages are dated facts

`src/lib/bobby.ts` is Bobby's US App Store listing as read on its `read` day,
next to SubEye's own listing read the same day; the page prints every fact "as
of" that day, so a Bobby update makes it dated, never false. Do not add a claim
the listing does not state (it never states its free limit, so neither does
the page), and do not repeat "Bobby's notifications are broken" — unverified.

`src/lib/priceRises.ts` is the price-rise log. **Next month's update is one
entry**, read on the service's own pricing page, its own announcement, or an
archive.org copy of that pricing page — never a news roundup; the test fails on
any other host. `onPricingPage` is the first archived capture showing the new
price, an upper bound rather than a stated date, and the page labels it that
way: Netflix and YouTube published no date at all.

`test/pricing.test.ts` reads the app's bundled
`apps/ios/SubEye/Resources/currencies.json` — deliberately, and only from a
test. The page names the SIZE of the catalogue out loud ("155 currencies"), so
the test pins that number against the catalogue's length in both locales, and
separately asserts that every code the page prints is one the app can hold. It
used to pin the whole five-code set; the catalogue is the ISO-4217 fiat list now
and copying it here would be the drift the test exists to prevent.

## Typography: Fixel

**Fixel Display** SemiBold for headings and **Fixel Text** 400/500 for
everything else — MacPaw's family, made in Kyiv, with full Cyrillic. The design
skill dealt faces that carry no Cyrillic (Stack Sans, Schibsted Grotesk, General
Sans, Pilcrow Rounded); a face without Cyrillic cannot set `/uk/`, so check that
before swapping. There is no mono: `.num` only sets
`font-variant-numeric: tabular-nums`.

Fonts are vendored into `public/fonts/` by `bun run --cwd apps/landing fonts`
and committed. Fixel is not on Google Fonts: the script downloads MacPaw's woff2
at a pinned commit and cuts each into latin / latin-ext / cyrillic with
`pyftsubset` (`pip install fonttools brotli`), and ships the OFL beside them.

**No asset may come from a third-party origin** — no CDN, no Google Fonts, no
analytics. StartupBar is the one runtime exception and it was
argued for above; the CSP still forbids every other host, so a font, image or
stylesheet on someone else's origin is blocked rather than merely discouraged.
That is a Lighthouse requirement and it is also the page's own argument.

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
   (`build`, `dev`, `type-check`, `test`), and `src/**/*.webp` for the app
   screens. Adding a new file type without adding its glob means Turbo replays
   a stale cached build after you edit a page.
2. **CI never deploys this site.** It runs the repo-wide quality gate and
   stops; `apps/landing` ships only when someone runs
   `bun run --cwd apps/landing deploy`. CI never runs `astro build` either, so
   a build-only failure first shows up at deploy time.

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

`wrangler deploy` attaches the `subeye.yhunko.dev` custom domain itself. The
old `www.subeye.cc` host is not this Worker: a Redirect Rule in the subeye.cc
zone 301s it to the same path here until that domain lapses on 2027-01-09.
