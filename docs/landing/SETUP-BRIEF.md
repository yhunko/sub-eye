# apps/landing — engineering brief

Build the SubEye marketing site as a new workspace at `apps/landing/`. Astro 6,
static output, no UI framework, 100 across all four Lighthouse categories,
English + Ukrainian.

This is the **engineering** brief. [DESIGN-BRIEF.md](DESIGN-BRIEF.md) is the
visual and copy spec and is still authoritative for look, voice, structure and
feature claims — read it in full before writing markup. Where the two disagree,
this file wins, and every such case is called out below.

A screenshot of the current site may be supplied as reference. Treat it as
reference only: the existing site had negligible traffic, so nothing about it is
worth preserving for continuity. Rebuild rather than port.

---

## Why this exists, and the one thing that must not slip

**The shipped iOS app opens four URLs and all four are 404 today.** That is the
sole reason this work is on the App Store critical path. App Store Connect
requires a resolving Privacy Policy URL, and Settings → Legal opens these in
front of a reviewer.

```
https://www.subeye.cc/en/terms-of-service/
https://www.subeye.cc/en/privacy-policy/
https://www.subeye.cc/uk/terms-of-service/
https://www.subeye.cc/uk/privacy-policy/
```

Exactly those. With the `/en` prefix, with trailing slashes, on the `www` host.

> **Correction to DESIGN-BRIEF.md.** That file states the contract as
> `/terms-of-service/` and `/uk/terms-of-service/` — English at the bare root.
> **That is stale.** Commit `769852a` changed the scheme to prefix *every*
> locale, English included, and `apps/landing/test/routes.test.ts` pins all four
> strings. The app no longer requests them — `@subeye/legal` ships the documents
> inside the binary — but App Store Connect holds the privacy-policy URL as
> metadata and a reviewer follows it. Build the four URLs above.

If the marketing page slips, ship the legal pages alone first. They are the
blocker; the marketing page is not.

---

## Stack

**Astro 6, `output: 'static'`, deployed to Vercel.**

Vercel, not Cloudflare Pages as DESIGN-BRIEF suggests: `subeye.cc` already
resolves to Vercel today, DNS is pointed, and a static marketing site gains
nothing from sharing a provider with the Worker. Moving hosts is churn on the
critical path. If you disagree, say so before starting — do not switch silently.

**No UI framework.** No React, Vue, Svelte, Solid — no islands at all. Astro
components and scoped CSS only. If a piece of interactivity needs JavaScript, it
is a plain `<script>` tag of vanilla TS, measured in hundreds of bytes.

**No CSS framework.** No Tailwind, no CSS-in-JS. Astro scoped `<style>` blocks
plus a small global stylesheet for tokens and resets. The palette is fixed (see
DESIGN-BRIEF) so a utility framework buys nothing and costs a build step and a
purge config.

**No third-party requests, at all.** No Google Fonts, no CDN, no analytics, no
embedded widgets. Every byte comes from the origin. This is both a Lighthouse
requirement and the page's own argument — a site whose headline is "SubEye never
touches your bank" must not phone home to four vendors.

---

## Monorepo integration

Bun workspaces + Turbo + Biome + TypeScript, same as everything else. Six traps,
all of which will bite silently:

1. **`turbo.json` `inputs` do not include `.astro`.** The `build`, `dev`,
   `type-check` and `test` tasks all list explicit input globs — `src/**/*.ts`,
   `.tsx`, `.js`, `.jsx`, `.json`. An `.astro` file is not in any of them, so
   Turbo will serve a **stale cached build after you edit a page**. Add
   `src/**/*.astro`, `src/**/*.css`, `src/**/*.md` and `astro.config.*` to the
   relevant task inputs. This repo has already lost a day to a cache replaying a
   green log for code that would have failed; do not repeat it.

2. **Biome does not lint `.astro` files.** `bun run lint` is `biome check .` at
   the root. Decide explicitly: either add `.astro` to Biome's ignore list, or
   run `astro check` as the landing's `lint`. Do not leave the files silently
   unchecked while the gate reports green.

3. **The production release workflow runs `bun run build`**, which is
   `turbo build` across every workspace. Adding this app puts an Astro build on
   the path of every Worker deploy. Either scope the workflow's build to the
   server (`turbo build --filter=@subeye/server`) or make sure a landing build
   failure cannot block an API deploy. State which you chose in the commit
   message. **Do not let a marketing-site typo be able to block a production API
   release.**

4. **`dependency-cruiser` has a `no-package-to-app` rule.** Packages may not
   import from `apps/`. The landing importing *from* packages is fine and is
   encouraged below; anything in `packages/` reaching into `apps/landing/` fails
   the build. `bun run check:boundaries` must stay green.

5. **`type-check`** for this workspace is `astro check`, not bare `tsc` — `.astro`
   files need Astro's own checker. Wire it as the workspace's `type-check`
   script so `turbo type-check` covers it.

6. **Vercel needs to build one workspace out of a monorepo.** Set the project's
   root directory and build command explicitly, and make sure the install step
   runs at the repo root so workspace links resolve.

---

## What to reuse from the monorepo

Reuse where it prevents drift, not for its own sake. Three real cases:

**The price timeline's numbers should be computed at build time by the real
product model.** The timeline is the page's signature element (DESIGN-BRIEF
calls it non-negotiable), and hardcoding `$0.00 → $4.99 → $12.99` in markup means
the marketing claim and the shipped behaviour can silently diverge. `@subeye/pricing`
exports `phaseProjection`, `phaseScheduling` and `phaseSelection`; `@subeye/spend`
exports `analyticsCalculator`, `pause` and `subscriptionCalculator`. Both are
pure, take `now` as a parameter, and touch no database or clock — which makes
them safe to call in an Astro frontmatter block at build time. Define the example
subscription once, run it through the real phase model, and render what comes
out. **Zero client JavaScript, and the page cannot lie about the product.**

**`@subeye/shared` owns vocabularies the page repeats.** The status words the
mockups show (`Active · Paused · Cancelling · Cancelled`) are
`subscriptionStatuses`. The supported currency set behind the "five currencies"
claim lives there too. Import them rather than retyping — a sixth currency should
break the build, not quietly make the page wrong.

**Pin the legal-URL contract with a test.** `test/routes.test.ts` asserts the
site serves exactly those four paths, against the page files that exist. It is
now the only place they are pinned — the app-side half was deleted with
`legal-url.ts` when the documents moved into the bundle — so it fails at CI
rather than in App Store review. This repo uses `bun:test` everywhere; there is
no vitest.

**Do not reuse:** `apps/mobile`'s Paraglide message catalog (those are app
strings for seven screens, unrelated to marketing copy), the mobile theme module
(React Native `StyleSheet` values — copy the hex codes from DESIGN-BRIEF
instead), or anything from `@subeye/currency`, which is a single type.

---

## i18n

Astro's built-in i18n routing, `defaultLocale: 'en'`, locales `['en', 'uk']`,
and **`prefixDefaultLocale: true`** — that flag is what produces `/en/...` and it
is exactly the contract above. `trailingSlash: 'always'` in the Astro config,
plus the matching Vercel setting; a mismatch turns the app's links into redirects
at best and 404s at worst.

- `<html lang>` per locale.
- `hreflang` alternates for both locales plus `x-default`.
- Ukrainian is **first-class, not a courtesy locale** — DESIGN-BRIEF is emphatic
  and it is right. Copy is written by a person; do not machine-translate. If the
  Ukrainian copy is not ready, ship the Ukrainian *legal* pages (they are the
  blocker) and let the marketing page follow.
- Cyrillic is wider: "Політика конфіденційності" is more than twice the width of
  "Privacy policy". Verify the nav, the pricing header and every button at 375px
  in both locales.
- A findable language switch in the top nav, not footer-only.

---

## Content

DESIGN-BRIEF has the exhaustive, verified feature list, the voice calibration,
the FAQ, and the "never imply these" list. Follow it. Do not invent features and
do not soften the "no bank linking, no email scanning" framing — it is the
product's actual differentiator.

**Two content corrections to DESIGN-BRIEF:**

- **Pricing is $11.99 once, always.** Not $19.99 (which the release checklist
  used to say, now corrected), and **no launch-price framing and no
  "first 100 get Pro free" promo** — decided 2026-07-27. Per-storefront pricing
  stays: roughly ₴199 in Ukraine, $11.99 in the US, adjusted elsewhere. That is
  real, Apple supports it, and almost no indie app says it out loud — design it
  as the trust signal it is, not a footnote.
- **Only claim what ships.** Pro is renewal reminders, trial-ending and
  price-change tracking, categories and the spend breakdown. DESIGN-BRIEF's
  "never imply" list says no CSV export yet; brief B6 lists export as a Pro
  feature. Export is **not shipped** — leave it off the page until it is.

**Scoped out of v1: the email capture form.** DESIGN-BRIEF designs it as goal
#2 with four states, a provider-agnostic endpoint and a GDPR consent affordance.
Skip it. The app is going to App Store review now, so a launch list would be
useful for a matter of weeks, and the form drags in a provider decision, a server
endpoint, an abuse surface and a consent flow — none of which are on the critical
path. Keep the "Coming to the App Store" state with no email field, and swap in a
real App Store badge when the app is live. Say so if you want it anyway and it
goes back in.

---

## Performance — 100/100/100/100 is the acceptance bar

Not "good scores". All four categories at 100, on mobile, for every one of the
six pages.

**Performance**
- Zero client JS by default. Budget: **under 5 KB** of JavaScript on any route,
  and zero is the target for the legal pages.
- Self-host fonts as `woff2`, subset per locale — **the Cyrillic subset is
  required**, and a full unsubsetted display face will cost you the score on
  `/uk/`. `font-display: swap`. Preload the display face only; preloading
  everything is the same as preloading nothing.
- Images through `astro:assets` (`<Image>` / `<Picture>`), AVIF with WebP
  fallback, explicit `width`/`height` on every one so CLS stays at zero,
  `loading="lazy"` below the fold, `fetchpriority="high"` on the LCP image only.
- `build.inlineStylesheets: 'auto'` so critical CSS does not cost a round trip.
- The one sanctioned motion moment is the timeline advancing on scroll
  (DESIGN-BRIEF). If it ships: CSS-driven, `prefers-reduced-motion` respected,
  and it must not move layout. No scroll-reveal anywhere else.

**Accessibility**
- Skip link, one `<h1>` per page, real landmarks, a visible `:focus-visible`
  ring everywhere.
- The palette clears AA comfortably — muted `#98a0ae` on `#0f1115` computes to
  roughly 7:1, brand green `#33a453` on the same ground to roughly 5.9:1. The
  risk is not the body text; it is focus rings, disabled states and anything set
  over `#171a20`. Verify those, do not assume.
- Alt text on every image; decorative art gets `alt=""`, not a description.

**Best practices**
- Security headers via `vercel.json`: a real CSP (achievable precisely *because*
  there are no third-party requests), HSTS, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy`.
- No console errors, no deprecated APIs, no mixed content.

**SEO**
- Canonical per page, `hreflang` alternates, `@astrojs/sitemap` with the i18n
  config, `robots.txt`.
- Open Graph and Twitter cards with a real generated OG image per locale.
- JSON-LD: `SoftwareApplication` (with `offers` at 11.99 USD) and
  `Organization`.

---

## Definition of done

1. All four legal URLs return **200** on the deployed site, with trailing
   slashes, on `www.subeye.cc`.
2. `bun run type-check`, `bun run test`, `bun run lint`, `bun run check:boundaries`
   and `bun run check:circular` all green **from the repo root**, and `turbo build`
   with `--force` green — a cached pass proves nothing here.
3. Lighthouse mobile 100/100/100/100 on `/en/`, `/uk/`, and all four legal pages.
   Paste the numbers in the PR.
4. The route-contract test passes and would fail if a locale prefix or trailing
   slash changed.
5. Verified at 375px in both locales.
6. A production Worker deploy still succeeds with this workspace present (trap 3).

---

## The legal copy itself

This is the actual blocker, and it is writing, not engineering. The pages must
state, at minimum:

> **Superseded by v5.** The list below was written for the v4 stack. The pages
> shipped: `apps/landing/src/pages/{en,uk}/privacy-policy.astro` is the source of
> truth. Nothing is collected but diagnostics and a purchase, the processors are
> Sentry, RevenueCat, Brandfetch, Google and **jsDelivr**, and deletion is
> Settings → Erase all data.

- **Collected:** ~~email address, name/username, Clerk user id, and~~ the
  subscription data the user enters (service names, amounts, dates, notes).
- **Processors, with regions:** ~~Clerk (auth), Neon (Postgres), Cloudflare (API
  hosting), PostHog EU (error telemetry), and~~ **Brandfetch** (brand logo search).
- **Brandfetch specifically:** when the user searches for a brand in the add/edit
  form, **what they type is sent to `api.brandfetch.io`** with their IP. Nothing
  else goes with it — no account id, no subscription data — and results are never
  written to disk. It is a third-party processor receiving user-typed text, so it
  has to be disclosed. Google is contacted for every logo image
  (`google.com/s2/favicons`), which discloses the domain and IP but nothing typed.
- **Why:** operating the service. No advertising, no tracking, no data sale.
- **Retention and deletion:** deleting the account in Settings removes the account
  and every subscription in it; the Clerk `user.deleted` webhook purges Postgres.
- **Contact:** a real address for privacy requests.
- **Rights:** GDPR access, erasure and portability — the product serves the EU
  and Ukraine.

Not legal advice, and a generic template is worse than useless here because the
processor list is specific to this stack. Have it reviewed if you can.

The legal pages open from inside a dark app, so they should feel like the same
product: real hierarchy, readable measure, same palette. Not a document dump.
