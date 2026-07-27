# SubEye v4.0.0 — manual steps (only you can do these)

Everything here needs credentials, a dashboard login, or a human decision.
No agent can do any of it.

⛔ = blocks App Store submission.

---

## M0 — `eas init`  ✅ done 2026-07-27

`expo.extra.eas.projectId` is now `e52f6dbb-…` with `owner: yehor.hunko`, and
`eas env:list` runs. Left here for the record: the project had never been
linked, and with `appVersionSource: "remote"` that had been blocking every EAS
build of every profile.

---

## M1 — Write and publish the legal pages  ⛔

**Verified 2026-07-27 — three of the four URLs the app links are 404 right now:**

| URL | Status |
| --- | --- |
| `https://www.subeye.cc/terms-of-service/` | **200** ✅ |
| `https://www.subeye.cc/privacy-policy/` | **404** ⛔ |
| `https://www.subeye.cc/uk/terms-of-service/` | **404** ⛔ |
| `https://www.subeye.cc/uk/privacy-policy/` | **404** ⛔ |

`/privacy`, `/privacy-policy` (no trailing slash), `/uk` and `/uk/` were all
404 too, so this is not a URL-shape mismatch — **the privacy policy does not
exist, and the site serves no Ukrainian locale at all.**

Two consequences, both live in the shipped app today:

1. **App Store Connect requires a working Privacy Policy URL.** A 404 there is a
   rejection before review even starts.
2. Settings → Privacy 404s for every user, and for a Ukrainian-locale device
   Settings → Terms 404s as well — `localePrefix()` in
   `apps/mobile/src/shared/config/legal.ts` builds `/uk/...` for a site that has
   no `/uk`.

**Decided 2026-07-27:** the landing redesign will serve `/en` and `/uk`, so the
app now prefixes **every** locale — English included. `legalUrl()` in
`apps/mobile/src/shared/config/legal-url.ts` builds exactly these four, and
`legal-url.test.ts` pins them:

```
https://www.subeye.cc/en/terms-of-service/
https://www.subeye.cc/en/privacy-policy/
https://www.subeye.cc/uk/terms-of-service/
https://www.subeye.cc/uk/privacy-policy/
```

**All four 404 today**, including the English terms page, which used to work at
the unprefixed root. That is deliberate — the app is written against the
redesign — but it means **the redesign shipping those four routes is now on the
submission critical path.** If the scheme changes again, `legal-url.ts` is the
only place it is encoded and the test will tell you.

The privacy policy must state, at minimum:

- **What is collected:** email address, name/username, Clerk user id, and the
  subscription data you enter (service names, amounts, dates, notes).
- **Who processes it:** Clerk (authentication), Neon (Postgres, database
  hosting), Cloudflare (API hosting), PostHog EU (error telemetry). Name them
  and their regions.
- **Why:** operating the service. No advertising, no tracking, no data sale.
- **Retention and deletion:** deleting the account in Settings removes the
  account and every subscription in it; the Clerk `user.deleted` webhook is
  what purges Postgres.
- **Contact:** a real address for privacy requests.
- **Rights:** GDPR access/erasure/portability, since you serve EU and Ukraine.

Not legal advice — have it reviewed if you can. A generic template is worse
than useless here because the processor list is specific to your stack.

---

## M2 — App Store Connect: app record and privacy label  ⛔

Bundle id `cc.subeye.app` is already correct in `app.json` for **both**
platforms — nothing to change there. Your `app.subeye.cc` API host and the
`subeye.cc` landing site are consistent with it.

1. Create the app record. Bundle id `cc.subeye.app`, SKU your choice,
   primary language English.
2. **Privacy Policy URL:** `https://www.subeye.cc/privacy-policy/`.
3. **App Privacy label** — must match the manifest now in `app.json`. Declare
   all five, each **linked to the user**, each "App Functionality", each
   **not** used for tracking:

   | Category | Type |
   | --- | --- |
   | Contact Info | Email Address |
   | Contact Info | Name |
   | Identifiers | User ID |
   | User Content | Other User Content |
   | Diagnostics | Crash Data |

   Crash Data is there because the Worker posts exceptions to PostHog keyed by
   your Clerk user id. It is real collection even though no SDK ships in the
   binary.
4. Age rating: 4+. No objectionable content.
5. **Encryption:** `usesNonExemptEncryption` is already `false` in `app.json`,
   so App Store Connect should not ask. If it does, answer that you use only
   standard HTTPS.
6. Screenshots: 6.9" iPhone required. The app is dark-only and portrait-only
   — capture on a real device, not the simulator's default frame.
7. Support URL and marketing URL on `subeye.cc`.

---

## M3 — Sign in with Apple  ✅ dashboard done 2026-07-27

Code (brief B1) and the Apple Developer / Clerk configuration are both done.
Verified locally: `bun run prebuild` writes
`com.apple.developer.applesignin: ["Default"]` into
`ios/SubEye/SubEye.entitlements`, so the capability is in the binary.

**Still unverified:** the flow itself, end to end, on a real device with a real
Apple ID — see M7. Steps kept below for the record and for the day the Clerk
instance is rebuilt.

1. **Apple Developer portal** → Identifiers → `cc.subeye.app` → enable the
   **Sign in with Apple** capability.
2. Create a **Services ID** and a **Sign in with Apple key** (`.p8`). Download
   the key once — Apple will not show it again. Note the Key ID and your Team
   ID (`Z6KADG969Z`).
3. **Clerk dashboard** (production instance) → SSO Connections → Apple. Paste
   the Services ID, Team ID, Key ID and the `.p8` contents.
4. **Register the native app's bundle id (`cc.subeye.app`) in that same Clerk
   Apple connection.** This is the step that is easy to miss and it is the one
   the native flow depends on: a native identity token's `aud` claim is the
   *bundle identifier*, not the Services ID, so a connection configured for the
   web flow alone will reject every token the app sends.
5. Register the native redirect URL Clerk gives you, alongside the existing
   `subeye://` entry under Native Applications. (Google and GitHub still use the
   web flow and need it; Apple no longer does.)
6. Confirm `*.p8` stays gitignored — `apps/mobile/.gitignore` already covers
   it. Never commit that key.
7. **Rebuild natively.** `ios.usesAppleSignIn` and the
   `expo-apple-authentication` plugin only write the
   `com.apple.developer.applesignin` entitlement during prebuild:

```bash
cd apps/mobile && bun run prebuild && bun run ios
```

   A Metro reload will not do it, and without the entitlement the sheet fails to
   present at all.

---

## M4 — Clerk production instance  ⛔ ← the next blocker

**Verified 2026-07-27:** `bunx eas env:list --environment production` returns
**"No variables found for this environment"**. Both required vars are missing.

That is not a degraded build, it is a dead one:
`apps/mobile/src/shared/config/env.ts` validates at module load and **throws
`Missing required env var: EXPO_PUBLIC_API_URL` before React renders a frame**.
A production build made today launches to the splash screen and then the error
boundary. Step 5 below is the fix and it is two commands.

The app currently uses a `pk_test_` key locally. A store build must not.

1. Create/promote the Clerk **production** instance.
2. Configure the same providers: email+password, Google, GitHub, and Apple.
3. **Webhook** → `https://app.subeye.cc/api/webhooks/clerk`, event
   `user.deleted`. Copy the signing secret.
4. Put the production values in Cloudflare via the GitHub environment —
   `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` as **secrets**,
   `CLERK_PUBLISHABLE_KEY` as a **var** — under the `production` environment.
   The release workflow pushes them with `wrangler secret bulk`.
5. Set the EAS production environment values:

```bash
bunx eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://app.subeye.cc
```

```bash
bunx eas env:create --environment production --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_YOUR_KEY
```

No trailing slash and no `/api` on the API URL — the server's `basePath("/api")`
rides on the Hono RPC accessor, and appending it makes every request 404 at
`/api/api/…`.

---

## M5 — App Store Connect: in-app purchase (before brief B6)

1. **Agreements, Tax, and Banking** → accept the Paid Applications agreement
   and complete banking and tax. Nothing IAP works until this is done, and it
   takes days, not minutes. Start it early even if the paywall ships later.
2. **App Store Small Business Program** → enroll. 15% commission instead of
   30% under $1M/yr. It is a form; there is no reason not to.
3. Create the IAP: **Non-Consumable**, product id `cc.subeye.app.pro.lifetime`,
   reference name "SubEye Pro (Lifetime)", price tier $19.99.
4. Add localized display name and description (en + uk).
5. **RevenueCat**: create the project, add the iOS app with bundle id
   `cc.subeye.app`, upload the App Store Connect **In-App Purchase Key**,
   create an entitlement called `pro`, attach the product, and create a
   default offering. Copy the public SDK key for brief B6.
6. A non-consumable needs a review screenshot of the purchase screen — you can
   only take that after B6 ships, so plan the order.

---

## M6 — Cloudflare rate limiting (pairs with brief B7)

Cloudflare dashboard → `subeye.cc` → Security → WAF → Rate limiting rules.

Suggested starting rule, free plan:

- **If** hostname equals `app.subeye.cc` and URI path starts with `/api/`
- **Then** rate limit to **120 requests per minute per IP**
- **Action:** Block, 60 second timeout

The app makes roughly 10–20 requests per user per day thanks to the 60s
`staleTime` and the MMKV cache, so 120/min will never touch a real user and
stops a script from burning Neon compute-hours.

Exclude `/api/webhooks/` from the rule — Clerk's Svix delivery retries in
bursts and must not be blocked.

---

## M7 — Pre-submission smoke test on a real device

The simulator does not exercise Clerk redirects, notification permission, or
the native tab bar the same way. On a real iPhone, with a **production**-profile
build:

- [ ] Sign up with email + password, verify the code, land on Home
- [ ] **A brand-new account lands on Home's empty state, and its button opens
      the add-subscription sheet** (not a zero hero and an empty trend)
- [ ] **On a device set to a non-Ukrainian region, that new account's currency
      is the region's** (EUR/USD/GBP/PLN) — and changing it in Settings by hand
      survives a reinstall + sign-in on the same device
- [ ] Sign in with Google, then GitHub, then **Apple** — and confirm Apple's
      "Hide My Email" path lands in the app with a session
- [ ] Reset password end to end
- [ ] Add a subscription with a category and a website — the row shows the real
      logo, and Home's category card shows more than "Uncategorized"
- [ ] **Settings → Categories: rename one, change its emoji, and delete one that
      has subscriptions in it** — the confirm names the count, the subscriptions
      survive as Uncategorized, and the list rows show the new name immediately
- [ ] **The subscriptions list's filter button opens the native sheet; Status,
      Sort by and Category each apply live, Reset clears them, and the button
      renders filled + green while any filter is on**
- [ ] **Pause a subscription, then find it under the Paused filter** — the list
      used to receive only active + cancelling rows from the server
- [ ] Add a subscription with a free trial; check the detail screen's price
      timeline
- [ ] Pause with a date, resume, cancel at period end, cancel now, renew, delete
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

## M8 — Decisions only you can make

| Question | Why it matters |
| --- | --- |
| iOS-only or iOS + Android at launch? | `eas.json` builds both today. Android doubles the store surface and the support load for a first release. Shipping iOS first is the usual solo-dev call. |
| Is `expo-router`'s **alpha** `unstable-native-tabs` acceptable in production? | It owns the primary navigation. It will break on an Expo bump at some point. The alternative is standard tabs and losing Liquid Glass. |
| Launch price: $19.99 lifetime? | Named in brief B6. Category comparables sit $10–25 lifetime. Easy to raise later, painful to lower. |
| Deprecation plan for `app.subeye.cc`? | You mentioned retiring it. Whatever replaces it must ship in the *app binary*, so the switch needs a store release, not a config change. Decide before v1, not after. |

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
