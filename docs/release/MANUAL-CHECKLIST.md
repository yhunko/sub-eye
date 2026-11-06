# SubEye — manual steps (only you can do these)

Everything here needs credentials, a dashboard login, or a human decision.
No agent can do any of it.

⛔ = blocks App Store submission. Steps are in the order they should happen.

> **Written for v4, and v5 removed the server.** There is no API, no database
> and no account any more. M2, M5 and M6 have corrections inline. Two Apple
> obligations disappear with accounts, and they were the expensive ones:
>
> - **Guideline 4.8 — Sign in with Apple.** Required only because the app
>   offered Google and GitHub sign-in. No third-party sign-in, no obligation.
> - **Guideline 5.1.1(v) — in-app account deletion.** Required only because the
>   app created accounts. Settings → Erase all data is now a courtesy, not a
>   compliance surface.
>
> The Sign in with Apple capability stays enabled on the App ID. The entitlement
> itself is gone as of the offline flip, but the capability cannot be switched
> off — and removing one from a registered App ID invalidates every provisioning
> profile for it anyway.

**Already done, kept only for the record:**

| Step | State |
| --- | --- |
| `eas init` | ✅ 2026-07-27 — `projectId e52f6dbb-…`, `owner yehor.hunko`. The project had never been linked, and with `appVersionSource: "remote"` that had been blocking every EAS build of every profile. |
| Sign in with Apple — Apple Developer capability | ✅ 2026-07-27, and **obsolete since v5**. The entitlement is gone: `app.json` no longer asks for it and prebuild writes only `aps-environment` and the App Group into `ios/SubEye/SubEye.entitlements`. The capability is still enabled on the App ID and cannot be removed — Apple answers "The bundle 'NS5LM36RJ8' cannot be deleted" to the console and to EAS alike, because the bundle has an App Store Connect app record. That mismatch is why every iOS build needs `EXPO_NO_CAPABILITY_SYNC=1`: EAS derives the capabilities from the entitlements and cannot apply the `APPLE_ID_AUTH: OFF` it computes. Leave the capability alone — see the banner above. Retried 2026-08-25 from the console with only that box unticked: same error. It is not worth another attempt — the only route is deleting the App Store Connect record, which is a far bigger loss than an inert checkbox. |
| iCloud — key-value storage | ✅ 2026-08-25, enabled **by hand** on `cc.subeye.app` (with CloudKit support and a container; only the key-value half is used). **It had to be by hand, and so will the next one.** `EXPO_NO_CAPABILITY_SYNC=1` is permanent for this app because of the Sign-in-with-Apple mismatch above, so EAS never pushes a capability to the portal again: from here on, **every new entitlement means a manual portal step, or the build dies in "Planning build"**. Enabling it does not fix a build on its own either — Xcode reuses the cached profile it already has, so the locally cached profile must be deleted too. |

---

## M2 — EAS production environment variables  ⛔

**Verified 2026-07-27:** `bunx eas env:list --environment production` returns
**"No variables found for this environment"**. So does `preview`.

That is not a degraded build, it is a dead one:
`apps/mobile/src/shared/config/env.ts` validates at module load and **throws
`Missing required env var: EXPO_PUBLIC_API_URL` before React renders a frame**.
A production build made today launches to the splash screen and then the error
boundary.

**v5:** `EXPO_PUBLIC_API_URL` and the old auth publishable key are no
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

**Served by `apps/landing` at `https://subeye.yhunko.dev`** (moved from
`www.subeye.cc` on 2026-11-05). **Decided 2026-07-27:** the site serves `/en`
and `/uk`, so every locale is prefixed, English included. `apps/landing/test/routes.test.ts` pins the four.

**Superseded 2026-08-25** for the app half: `@subeye/legal` puts both documents
in the bundle, and Settings → Legal and the paywall now open a native sheet
rather than a browser. The site is still on the submission critical path, but
only through metadata — App Store Connect requires a resolving Privacy Policy
URL and a reviewer follows it, so a 404 is a rejection before review starts.
Nothing inside the app 404s any more.

The privacy policy must state, at minimum:

**Superseded by v5 — the shipped pages already say this.** The requirement list
below described the v4 stack; the pages at `/en/privacy-policy/` and
`/uk/privacy-policy/` were rewritten for the offline app and are the source of
truth. What changed: nothing is collected but diagnostics and a purchase, the
processor list is Sentry, RevenueCat, Brandfetch, Google and **jsDelivr** (the
daily FX document), and deletion is Settings → Erase all data.

- **What is collected:** the subscription data you enter — which stays on the device.
- **Who processes it:** **Brandfetch** (brand logo search). Name them and their regions.
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

## M5 — App Store Connect: app record and privacy label  ⛔

Bundle id `cc.subeye.app` is already correct in `app.json` for **both**
platforms.

1. Create the app record. Bundle id `cc.subeye.app`, SKU your choice, primary
   language English.
2. **Privacy Policy URL:** `https://subeye.yhunko.dev/en/privacy-policy/` (M3).
3. **App Privacy label** — each is "App Functionality" and **not** used for
   tracking.

   With accounts and the API gone, there is no email address, no name and no
   user id to collect, and the subscriptions you type never leave the device —
   data that stays on the device is not "collected" under Apple's definition.
   Declare:

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
7. Support URL and marketing URL on `subeye.yhunko.dev` (STORE-METADATA.md).

---

## M6 — First EAS build, then a device smoke test  ⛔

**`eas build:list` is empty — no build has ever been produced.** iOS
credentials, provisioning, the Apple Sign in entitlement in a *signed* binary,
and `eas submit` are all completely unexercised, and `eas.json` has no `submit`
block at all. Budget a cycle for credentials alone.

Batch any native change into the prebuild before burning a build.

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
- [ ] Add a free trial from the + menu; check that the detail screen's first
      payment is the trial's end day and its price timeline
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

## M8 — App Store Connect: in-app purchase (before brief B6)

1. **Agreements, Tax, and Banking** → accept the Paid Applications agreement and
   complete banking and tax. Nothing IAP works until this is done, and it takes
   days, not minutes. Start it early even if the paywall ships later.
2. **App Store Small Business Program** → enroll. 15% commission instead of 30%
   under $1M/yr. It is a form; there is no reason not to.
3. Create the IAP: **Non-Consumable**, product id `cc.subeye.app.pro.lifetime`,
   reference name "SubEye Pro (Lifetime)", price **$14.99** (decided
   2026-07-27 at $11.99, raised 2026-11-04 — not a launch price, no promo codes).
   Per-storefront pricing stays on Apple's default conversion, except Ukraine's
   dollar storefront, hand-set to $11.99; the landing page states this outright
   as a trust signal.
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
question only invites it. **Pro is $14.99 once**, always, no promo codes.

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

Nothing left bills per user, so the floor is the Apple Developer Program and
whatever EAS costs, and it does not move as the app grows.
