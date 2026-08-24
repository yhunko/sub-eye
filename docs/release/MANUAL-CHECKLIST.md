# SubEye — manual steps (only you can do these)

Everything here needs credentials, a dashboard login, or a human decision.
No agent can do any of it.

⛔ = blocks App Store submission. Steps are in the order they should happen.

> **Written for v4, and v5 removed the server.** There is no API, no database
> and no account any more. M1 and M4 are history and are kept as such; M2, M5,
> M6 and M7 have corrections inline. Three Apple obligations disappear with
> accounts, and they were the expensive ones:
>
> - **Guideline 4.8 — Sign in with Apple.** Required only because the app
>   offered Google and GitHub sign-in. No third-party sign-in, no obligation.
> - **Guideline 5.1.1(v) — in-app account deletion.** Required only because the
>   app created accounts. Settings → Erase all data is now a courtesy, not a
>   compliance surface.
> - **Token revocation.** 4.8 also required calling Apple's `/auth/revoke` on
>   deletion, which the app never implemented — it deleted at Clerk and let a
>   webhook purge Postgres, leaving the Apple token live. That gap is gone
>   rather than fixed.
>
> The Sign in with Apple capability stays in the entitlements file: removing a
> capability from a registered App ID invalidates every provisioning profile.

**Already done, kept only for the record:**

| Step | State |
| --- | --- |
| `eas init` | ✅ 2026-07-27 — `projectId e52f6dbb-…`, `owner yehor.hunko`. The project had never been linked, and with `appVersionSource: "remote"` that had been blocking every EAS build of every profile. |
| Sign in with Apple — Apple Developer capability + Clerk SSO connection | ✅ 2026-07-27, and **obsolete since v5**. `bun run prebuild` writes `com.apple.developer.applesignin: ["Default"]` into `ios/SubEye/SubEye.entitlements` and it is still in the binary; nothing calls it. The flow was never exercised and never will be. Leave the capability alone — see the banner above. |

---

## M1 — Ship v4 to production (server + database)  ✅ done 2026-07-27, then deleted in v5

*Historical. The server and the database this describes no longer exist.*

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

**v5:** `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` are no
longer read by anything — `apps/mobile/src/shared/config/env.ts` is the source of
truth and asks for `BRANDFETCH_CLIENT_ID`, `REVENUECAT_IOS_KEY` and
`SENTRY_DSN` only. Delete the two stale entries from the EAS `production` and
`preview` environments so the list matches the binary. The paragraph below about
the API URL's trailing slash is kept because it explains a trap that cost a
build; it no longer applies.

~~No trailing slash and no `/api` on the API URL — the server's `basePath("/api")`
rides on the Hono RPC accessor, and appending it makes every request 404 at
`/api/api/…`.~~

Then, from a free account at
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

**Superseded by v5 — the shipped pages already say this.** The requirement list
below described the v4 stack; the pages at `/en/privacy-policy/` and
`/uk/privacy-policy/` were rewritten for the offline app and are the source of
truth. What changed: nothing is collected but diagnostics and a purchase, the
processor list is Sentry, RevenueCat, Brandfetch, Google and **jsDelivr** (the
daily FX document), and deletion is Settings → Erase all data.

- **What is collected:** ~~email address, name/username, Clerk user id, and~~ the
  subscription data you enter — which stays on the device.
- **Who processes it:** ~~Clerk (authentication), Neon (Postgres), Cloudflare (API
  hosting), PostHog EU (error telemetry), and~~ **Brandfetch** (brand logo
  search). Name them and their regions.
- **Brandfetch specifically:** when the user searches for a brand in the
  add/edit form, **what they type is sent to `api.brandfetch.io`** along with
  their IP. Nothing else goes with it — no account id, no subscription data —
  and the results are never written to disk. Say so; it is a third-party
  processor receiving user-typed text and it has to be disclosed. Google is also
  contacted for every logo image (`google.com/s2/favicons`), which discloses the
  domain and the IP but nothing the user typed.
- **Why:** operating the service. No advertising, no tracking, no data sale.
- **Retention and deletion:** Settings → Erase all data clears the device.
  There is no copy anywhere else to purge.
- **Contact:** a real address for privacy requests.
- **Rights:** GDPR access/erasure/portability, since you serve EU and Ukraine.

Not legal advice — have it reviewed if you can. A generic template is worse than
useless here because the processor list is specific to your stack.

---

## M4 — Clerk production instance  ✅ done 2026-07-27, then removed in v5

*Historical. Kept for the record of what was configured, so it can be recognised
when the instance is torn down. Nothing below is a live instruction.*

The production instance exists with Sign in with Apple configured. What remains
is not dashboard work: the **`pk_live_` key has to reach the build** via M2, and
the flow has to be exercised on a real device in M6. A `pk_test_` key in a store
build is a total silent failure.

Steps kept for the day the instance is rebuilt:

1. Create/promote the Clerk **production** instance.
2. Configure the same providers: email+password, Google, GitHub, and Apple.
3. **Enable the Native SDK on the production instance.** This one is invisible
   when it is wrong: `clerk-expo` never finishes its handshake, `isLoaded` stays
   false forever, and Clerk raises no error a client can catch — so every guard
   written as `if (!isLoaded) return` becomes a button that does nothing and
   says nothing. It cost three TestFlight builds on 2026-07-29, with a healthy
   `/v1/environment` answering 200 the whole time. A development instance has it
   on by default; a production instance does not.
4. Confirm `subeye://` and the SSO redirect URL are registered under Native
   Applications. For Apple, register the **native bundle id `cc.subeye.app`** in
   the Apple connection — a native identity token's `aud` claim is the bundle
   identifier, not the Services ID, so a web-only connection rejects every token
   the app sends.
5. **Webhook** → `https://app.subeye.cc/api/webhooks/clerk`, event
   `user.deleted`. Copy the signing secret. Account deletion depends on it
   (`apps/server/src/routes/webhooks/clerk/handlers/userDeleted.ts`) — without
   it, deleted accounts leave orphaned Postgres rows, which is a GDPR problem
   rather than a tidiness one.
6. Put the production values in Cloudflare via the GitHub environment —
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
   | Purchases | Purchase History | yes |
   | Browsing/Search | Search History | **no** |

   Crash Data is there because the Worker posts exceptions to PostHog keyed by
   your Clerk user id. It is real collection even though no SDK ships in the
   binary today — brief B3 would add one.

   Purchase History is RevenueCat (brief B6, landed). It is linked because the
   RevenueCat app user id **is** the Clerk user id. The matching manifest entry
   is `NSPrivacyCollectedDataTypePurchaseHistory` in `app.json`.

   Search History is the brand picker: the text typed into it goes to
   Brandfetch. **Not** linked — no account id or Clerk token travels with that
   request, and the app never stores the results.

   ### The table above is superseded by the offline flip (Plan B)

   With accounts and the API gone, there is no email address, no name and no
   user id to collect, and the subscriptions you type never leave the device —
   data that stays on the device is not "collected" under Apple's definition.
   Declare this instead:

   | Category | Type | Linked to the user |
   | --- | --- | --- |
   | Diagnostics | Crash Data | **no** |
   | Purchases | Purchase History | **no** |
   | Browsing/Search | Search History | **no** |

   Nothing is linked any more, because there is no identifier left to link it
   to: `shared/lib/sentry.ts` sets `sendDefaultPii: false` and attaches no user,
   and `entities/pro/model/purchases.ts` configures RevenueCat with
   `appUserID: null`, which makes the app user id anonymous and device-local.

   **`app.json`'s `NSPrivacyCollectedDataTypes` still declares the old seven and
   still says `Linked: true`.** Editing it is a mobile change and is deliberately
   not part of the Plan B server-removal commits — do it before the first
   submission, and keep it matching the table above, or the manifest and the
   App Store Connect answers disagree.
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

Then, on a real iPhone with that build — the simulator does not exercise
notification permission or the native tab bar the same way:

- [ ] **A cold install opens straight onto Home's empty state, with no network**,
      and its button opens the add-subscription sheet
- [ ] **On a device set to a non-Ukrainian region, a fresh install's currency is
      the region's** (EUR/USD/GBP/PLN) — and changing it in Settings by hand
      survives an app restart
- [ ] **With the network off from first launch, amounts in a second currency
      still convert** — that is the bundled FX seed doing its job — and going
      online refreshes them from `cdn.jsdelivr.net`
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
- [ ] **Pause a subscription, then find it under the Paused filter**
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
- [ ] Kill and cold-start the app: it paints its data, not a spinner
- [ ] Airplane mode from a cold start: everything works, nothing degrades
- [ ] **Settings → Erase all data** — every screen empties without a restart,
      and a cold start after it shows the empty state

---

## M7 — Cloudflare rate limiting  ✅ moot since v5

There is no API to rate-limit. `app.subeye.cc` serves nothing once the Worker is
deleted. The landing site is static assets and needs no WAF rule.

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

   Two traps, both hit on 2026-07-29 and both written up in
   [PAYMENTS-BRIEF.md](PAYMENTS-BRIEF.md) Part 1: the **In-App Purchase key is
   not the App Store Connect API key** (`SubscriptionKey_….p8` vs
   `AuthKey_….p8`, both under Integrations, and the wrong one reports "valid
   format" then fails on the bundle id), and **the store build needs the
   `appl_…` key, never the Test Store `test_…` one** — RevenueCat rejects a test
   key in a release build, which silently kills the paywall, the entitlement and
   every dashboard grant at once.
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

---

## Fixed cost floor, for reference

**v5 changed this completely.** Removing the API, the database and accounts
removes everything that scaled with users:

| Service | Free ceiling | First bill |
| --- | --- | --- |
| Cloudflare Workers (landing only) | 100k req/day | $5/mo |
| Sentry | limited errors/mo | — |
| EAS | limited queued builds, or build locally for $0 | $19/mo |
| Apple Developer | — | **$99/yr** |

~~Neon $19/mo, Clerk $25/mo + $0.02/MAU, PostHog~~ — all gone with the server.
Nothing left bills per user, so the floor is the Apple Developer Program and
whatever EAS costs, and it does not move as the app grows.
