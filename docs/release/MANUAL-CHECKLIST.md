# SubEye v4.0.0 — manual steps (only you can do these)

Everything here needs credentials, a dashboard login, or a human decision.
No agent can do any of it.

⛔ = blocks App Store submission. Steps are in the order they should happen.

**Already done, kept only for the record:**

| Step | State |
| --- | --- |
| `eas init` | ✅ 2026-07-27 — `projectId e52f6dbb-…`, `owner yehor.hunko`. The project had never been linked, and with `appVersionSource: "remote"` that had been blocking every EAS build of every profile. |
| Sign in with Apple — Apple Developer capability + Clerk SSO connection | ✅ 2026-07-27. `bun run prebuild` writes `com.apple.developer.applesignin: ["Default"]` into `ios/SubEye/SubEye.entitlements`, so the capability is in the binary. The **flow itself is still unexercised** — it is a line item in M6. If the Clerk instance is ever rebuilt, the part that is easy to miss is registering the native bundle id (`cc.subeye.app`) in the Apple connection: a native identity token's `aud` claim is the bundle identifier, not the Services ID, so a web-only connection rejects every token the app sends. |

---

## M1 — Ship v4 to production (server + database)  ✅ done 2026-07-27

Production ran the **v3 API** until this landed: `origin/main` sat on v3.11.0
from 2026-06-05 while `dev` was 50 commits ahead, so the v4 mobile client had no
backend that could pause, resume, or manage a pricing phase.

The order was the point — the destructive half ran by hand, under supervision,
so the merge was only a deploy:

1. A Neon branch of production as the backup, and a second branch to rehearse
   on. (A branch you rehearse on stops being a backup the moment you migrate it.)
2. `db:reset-ledger`, then `db:migrate`. The v4 baseline is migration `0000` of a
   squashed journal while production's ledger still held the v3 entries, so
   without the reset, whether drizzle-kit applied it at all came down to
   timestamp luck.
3. `test/status-backfill-parity.test.ts` with `PARITY_DATABASE_URL`, against real
   production rows — **2 pass**. This is the only step that transforms data
   rather than shape (`status` derived from a naive-UTC `cancelled_at`), which is
   why it is worth running against real rows and not fixtures.
4. `db:backfill-users`, to copy preferences out of Clerk `publicMetadata`. The
   migration seeds defaults-only rows, and a missing value fails *silently* —
   `UserService.getUserPreferences` returns defaults for an unpopulated row.
5. PR #41 merged → CI's own `db:migrate` found the baseline already in the ledger
   and no-opped → **v4.0.0** tagged and deployed.

Verified after: `POST /api/subscriptions/:id/resume` → `401` (v4 route present),
`GET /api/subscriptions/:id/history` → `404` (v3 route gone).

**Reuse this shape for any future breaking migration.** The release workflow
still does not run `db:reset-ledger` or `db:backfill-users`, so a migration
needing either must be done by hand before the merge, never left to CI. And note
the deploy window: between the migration and the new Worker going live, the old
code is serving traffic against the new schema.

---

## M2 — EAS production environment variables  ⛔

**Verified 2026-07-27:** `bunx eas env:list --environment production` returns
**"No variables found for this environment"**. So does `preview`.

That is not a degraded build, it is a dead one:
`apps/mobile/src/shared/config/env.ts` validates at module load and **throws
`Missing required env var: EXPO_PUBLIC_API_URL` before React renders a frame**.
A production build made today launches to the splash screen and then the error
boundary.

```bash
bunx eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://app.subeye.cc
```

```bash
bunx eas env:create --environment production --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_YOUR_KEY
```

No trailing slash and no `/api` on the API URL — the server's `basePath("/api")`
rides on the Hono RPC accessor, and appending it makes every request 404 at
`/api/api/…`. The publishable key must be `pk_live_`; a `pk_test_` key in a
store build is a total silent failure.

Then the **optional** third, from a free account at
[developers.brandfetch.com](https://developers.brandfetch.com). The client id is
public by design — it ships in the bundle either way:

```bash
bunx eas env:create --environment production --name EXPO_PUBLIC_BRANDFETCH_CLIENT_ID --value YOUR_CLIENT_ID
```

Skipping it does not break the build, and as of 2026-07-27 it does not even
break search — the endpoint answers anonymous requests. Set it anyway: `c` is
documented as required, and the day Brandfetch enforces it a shipped binary
cannot be reconfigured. The picker still lets you type a domain by hand.

---

## M3 — Write and publish the legal pages  ⛔

**Verified 2026-07-27 — all four URLs the app links are 404:**

| URL | Status |
| --- | --- |
| `https://www.subeye.cc/en/terms-of-service/` | **404** ⛔ |
| `https://www.subeye.cc/en/privacy-policy/` | **404** ⛔ |
| `https://www.subeye.cc/uk/terms-of-service/` | **404** ⛔ |
| `https://www.subeye.cc/uk/privacy-policy/` | **404** ⛔ |

The unprefixed `https://www.subeye.cc/terms-of-service/` still returns 200, and
it is the only legal page that exists. The privacy policy does not exist at any
path, and the site serves no Ukrainian locale at all.

**This is work in another repo.** `subeye.cc` is a Vercel deployment; nothing
about it lives in this monorepo. `docs/landing/DESIGN-BRIEF.md` is the brief for
the redesign that serves these routes.

**Decided 2026-07-27:** the redesign serves `/en` and `/uk`, so the app prefixes
**every** locale, English included. `legalUrl()` in
`apps/mobile/src/shared/config/legal-url.ts` builds exactly those four and
`legal-url.test.ts` pins them. That means **the redesign shipping those four
routes is on the submission critical path.** If the scheme changes again,
`legal-url.ts` is the only place it is encoded and the test will tell you.

Two consequences live in the shipped app today: App Store Connect requires a
resolving Privacy Policy URL (a 404 is a rejection before review starts), and
Settings → Privacy 404s for every user.

The privacy policy must state, at minimum:

- **What is collected:** email address, name/username, Clerk user id, and the
  subscription data you enter (service names, amounts, dates, notes).
- **Who processes it:** Clerk (authentication), Neon (Postgres), Cloudflare (API
  hosting), PostHog EU (error telemetry), and **Brandfetch** (brand logo
  search). Name them and their regions.
- **Brandfetch specifically:** when the user searches for a brand in the
  add/edit form, **what they type is sent to `api.brandfetch.io`** along with
  their IP. Nothing else goes with it — no account id, no subscription data —
  and the results are never written to disk. Say so; it is a third-party
  processor receiving user-typed text and it has to be disclosed. Google is also
  contacted for every logo image (`google.com/s2/favicons`), which discloses the
  domain and the IP but nothing the user typed.
- **Why:** operating the service. No advertising, no tracking, no data sale.
- **Retention and deletion:** deleting the account in Settings removes the
  account and every subscription in it; the Clerk `user.deleted` webhook is what
  purges Postgres.
- **Contact:** a real address for privacy requests.
- **Rights:** GDPR access/erasure/portability, since you serve EU and Ukraine.

Not legal advice — have it reviewed if you can. A generic template is worse than
useless here because the processor list is specific to your stack.

---

## M4 — Clerk production instance  ✅ done 2026-07-27

The production instance exists with Sign in with Apple configured. What remains
is not dashboard work: the **`pk_live_` key has to reach the build** via M2, and
the flow has to be exercised on a real device in M6. A `pk_test_` key in a store
build is a total silent failure.

Steps kept for the day the instance is rebuilt:

1. Create/promote the Clerk **production** instance.
2. Configure the same providers: email+password, Google, GitHub, and Apple.
3. Confirm `subeye://` and the SSO redirect URL are registered under Native
   Applications. For Apple, register the **native bundle id `cc.subeye.app`** in
   the Apple connection — a native identity token's `aud` claim is the bundle
   identifier, not the Services ID, so a web-only connection rejects every token
   the app sends.
4. **Webhook** → `https://app.subeye.cc/api/webhooks/clerk`, event
   `user.deleted`. Copy the signing secret. Account deletion depends on it
   (`apps/server/src/routes/webhooks/clerk/handlers/userDeleted.ts`) — without
   it, deleted accounts leave orphaned Postgres rows, which is a GDPR problem
   rather than a tidiness one.
5. Put the production values in Cloudflare via the GitHub environment —
   `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` as **secrets**,
   `CLERK_PUBLISHABLE_KEY` as a **var** — under the `production` environment.
   The release workflow pushes them with `wrangler secret bulk`.

---

## M5 — App Store Connect: app record and privacy label  ⛔

Bundle id `cc.subeye.app` is already correct in `app.json` for **both**
platforms. Your `app.subeye.cc` API host and the `subeye.cc` landing site are
consistent with it.

1. Create the app record. Bundle id `cc.subeye.app`, SKU your choice, primary
   language English.
2. **Privacy Policy URL:** `https://www.subeye.cc/en/privacy-policy/` (M3).
3. **App Privacy label** — must match the manifest in `app.json`. Each is
   "App Functionality" and **not** used for tracking:

   | Category | Type | Linked to the user |
   | --- | --- | --- |
   | Contact Info | Email Address | yes |
   | Contact Info | Name | yes |
   | Identifiers | User ID | yes |
   | User Content | Other User Content | yes |
   | Diagnostics | Crash Data | yes |
   | Browsing/Search | Search History | **no** |

   Crash Data is there because the Worker posts exceptions to PostHog keyed by
   your Clerk user id. It is real collection even though no SDK ships in the
   binary today — brief B3 would add one.

   Search History is the brand picker: the text typed into it goes to
   Brandfetch. **Not** linked — no account id or Clerk token travels with that
   request, and the app never stores the results.
4. Age rating: 4+. No objectionable content.
5. **Encryption:** `usesNonExemptEncryption` is already `false` in `app.json`,
   so App Store Connect should not ask. If it does, answer that you use only
   standard HTTPS.
6. Screenshots: 6.9" iPhone required. The app is dark-only and portrait-only —
   capture on a real device, not the simulator's default frame.
7. Support URL and marketing URL on `subeye.cc`.

---

## M6 — First EAS build, then a device smoke test  ⛔

**`eas build:list` is empty — no build has ever been produced.** iOS
credentials, provisioning, the Apple Sign in entitlement in a *signed* binary,
and `eas submit` are all completely unexercised, and `eas.json` has no `submit`
block at all. Budget a cycle for credentials alone.

`apps/mobile/.env` points at a LAN wrangler-dev host, so the app has never talked
to a deployed backend of any kind. M1 is done, so the backend is finally real —
but M2 has to be green first or this step only proves the error boundary works.

Batch any native change (brief B3 adds a module) into the prebuild before
burning a build.

```bash
bunx eas build --profile production --platform ios
```

Then, on a real iPhone with that build — the simulator does not exercise Clerk
redirects, notification permission, or the native tab bar the same way:

- [ ] Sign up with email + password, verify the code, land on Home
- [ ] **A brand-new account lands on Home's empty state, and its button opens
      the add-subscription sheet** (not a zero hero and an empty trend)
- [ ] **On a device set to a non-Ukrainian region, that new account's currency
      is the region's** (EUR/USD/GBP/PLN) — and changing it in Settings by hand
      survives a reinstall + sign-in on the same device
- [ ] Sign in with Google, then GitHub, then **Apple** — and confirm Apple's
      "Hide My Email" path lands in the app with a session
- [ ] Reset password end to end
- [ ] Add a subscription with a category and a brand — the row shows the real
      logo, and Home's category card shows more than "Uncategorized"
- [ ] **Tap the avatar at the top of the form** — it opens on the 20 popular
      services, each with a real logo rather than a letter tile
- [ ] **Search a brand and pick it** — the empty Name field fills with the
      brand's name, an already-typed name is left alone, "No logo" clears it,
      and typing `netflix.com` offers "Use netflix.com"
- [ ] **In airplane mode, open the brand picker and type** — it shows no results
      and no error screen, and the "Use …" row still commits a typed domain
- [ ] **Settings → Categories: rename one, change its emoji, and delete one that
      has subscriptions in it** — the confirm names the count, the subscriptions
      survive as Uncategorized, and the list rows show the new name immediately
- [ ] **The subscriptions list's filter button opens the native sheet; Status,
      Sort by and Category each apply live, Reset clears them, and the button
      renders filled + green while any filter is on**
- [ ] **Pause a subscription, then find it under the Paused filter** — this is
      the path that 404s against a v3 server, so it double-checks M1
- [ ] Add a subscription with a free trial; check the detail screen's price
      timeline
- [ ] Pause with a date, resume, cancel at period end, cancel now, renew, delete
- [ ] **A cancelled subscription reads as finished**, and Home's attention card
      surfaces what needs attention rather than a trend chart
- [ ] Enable renewal reminders, accept the permission, confirm one is scheduled
- [ ] Deny the permission and confirm the row shows "Off" with a settings link
- [ ] Change currency in Settings; every amount re-denominates
- [ ] Switch the per-app language to Ukrainian in iOS Settings and reopen —
      **check the Terms and Privacy links open the `/uk/` pages**
- [ ] Kill and cold-start the app: it paints cached data, not a spinner
- [ ] Airplane mode: the app still renders the cached dashboard
- [ ] Sign out, then delete an account, and confirm in Neon that the rows are
      gone (this proves the Clerk webhook is wired)

---

## M7 — Cloudflare rate limiting (pairs with brief B7)

Cloudflare dashboard → `subeye.cc` → Security → WAF → Rate limiting rules.

Suggested starting rule, free plan:

- **If** hostname equals `app.subeye.cc` and URI path starts with `/api/`
- **Then** rate limit to **120 requests per minute per IP**
- **Action:** Block, 60 second timeout

The app makes roughly 10–20 requests per user per day thanks to the 60s
`staleTime` and the MMKV cache, so 120/min will never touch a real user and
stops a script from burning Neon compute-hours.

Exclude `/api/webhooks/` from the rule — Clerk's Svix delivery retries in bursts
and must not be blocked.

---

## M8 — App Store Connect: in-app purchase (before brief B6)

1. **Agreements, Tax, and Banking** → accept the Paid Applications agreement and
   complete banking and tax. Nothing IAP works until this is done, and it takes
   days, not minutes. Start it early even if the paywall ships later.
2. **App Store Small Business Program** → enroll. 15% commission instead of 30%
   under $1M/yr. It is a form; there is no reason not to.
3. Create the IAP: **Non-Consumable**, product id `cc.subeye.app.pro.lifetime`,
   reference name "SubEye Pro (Lifetime)", price tier **$11.99** (decided
   2026-07-27 — not a launch price, no promo codes). Leave per-storefront pricing
   on Apple's default conversion so a Ukrainian storefront shows roughly ₴199;
   the landing page states this outright as a trust signal.
4. Add localized display name and description (en + uk).
5. **RevenueCat**: create the project, add the iOS app with bundle id
   `cc.subeye.app`, upload the App Store Connect **In-App Purchase Key**, create
   an entitlement called `pro`, attach the product, and create a default
   offering. Copy the public SDK key for brief B6.
6. A non-consumable needs a review screenshot of the purchase screen — you can
   only take that after B6 ships, so plan the order.

---

## M9 — Decisions only you can make

**Settled 2026-07-27:** **iOS only at launch** — Android later if it is ever
warranted. Build `--platform ios`, and per DESIGN-BRIEF the landing page must not
mention Android at all, not even as a greyed-out badge; raising the platform
question only invites it. **Pro is $11.99 once**, always, no promo codes.

| Still open | Why it matters |
| --- | --- |
| Is `expo-router`'s **alpha** `unstable-native-tabs` acceptable in production? | It owns the primary navigation. It will break on an Expo bump at some point. The alternative is standard tabs and losing Liquid Glass. |
| Deprecation plan for `app.subeye.cc`? | You mentioned retiring it. Whatever replaces it must ship in the *app binary*, so the switch needs a store release, not a config change. Decide before v1, not after. |
| Keep CORS on the API? | `CLIENT_ORIGIN` and the `cors()` middleware exist for the retired web client. React Native sends no `Origin`, so they gate nothing today. Cheap to keep, one less binding to drop — but do not drop it in the same release as M1. |

---

## Fixed cost floor, for reference

| Service | Free ceiling | First bill |
| --- | --- | --- |
| Cloudflare Workers | 100k req/day | $5/mo |
| Neon | 0.5 GB + 190 compute-hrs/mo | $19/mo |
| Clerk | 10,000 MAU | $25/mo + $0.02/MAU |
| PostHog | 1M events/mo (you send only exceptions) | — |
| EAS | limited queued builds, or build locally for $0 | $19/mo |
| Apple Developer | — | **$99/yr** |

You stay free to roughly 5–10k DAU. **About 15 lifetime purchases a year makes
you cash-neutral.**
