# Getting SubEye onto TestFlight — the short path

The goal here is **one build, on your phone, through TestFlight**. Nothing else.

Deliberately **not** in this document, because none of it is required to install
a TestFlight build: the Paid Applications agreement, the in-app purchase product,
RevenueCat's Apple configuration, screenshots, the App Privacy label, the store
description, or App Review. Those belong to submission ([MANUAL-CHECKLIST.md](MANUAL-CHECKLIST.md)
M5 and M8), and every one of them is easier to do once you have seen the app run
on a real device.

[SENTRY-BRIEF.md](SENTRY-BRIEF.md) **has landed**, and it changed the shape of
this document: a production build now runs a source-map upload as part of the
bundle phase, and that phase **fails the build** if the upload fails. Step 2 is
therefore no longer optional — see the box there.

---

## Before you start

| | |
| --- | --- |
| Apple Developer Program | active — team `Z6KADG969Z` is already in `app.json` |
| Bundle id `cc.subeye.app` | registered — Sign in with Apple was configured against it |
| EAS project | linked — `projectId e52f6dbb-…` |
| Xcode | not needed. EAS builds in the cloud |

---

## Step 1 — Create the app record in App Store Connect

This is the only Apple step that actually blocks a TestFlight upload.

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** → **+** → **New App**
2. Platform **iOS**, Name **SubEye**, Primary language **English (U.S.)**
3. **Bundle ID:** pick `cc.subeye.app` from the dropdown. If it is not in the
   list, the identifier is missing from the Developer portal — add it under
   Certificates, IDs & Profiles → Identifiers with **Sign in with Apple**
   enabled, then come back.
4. **SKU:** anything, never shown to anyone. `subeye-ios` is fine.
5. Full Access, then **Create**.

⚠️ The bundle id on this form is permanent and globally unique across all of
Apple. A typo means a dead app record you cannot delete or reuse.

That is the whole Apple step. Ignore every "Missing metadata" warning the
dashboard now shows you — those are submission requirements, not TestFlight ones.

---

## Step 2 — Fill in the EAS production environment

A production build boots to the error boundary without all four of these.
`src/shared/config/env.ts` validates at module load and throws before React
renders a frame, so a missing variable is a black screen, not a degraded app.

Check what is there:

```bash
bunx eas env:list --environment production
```

As of 2026-07-29 all five `EXPO_PUBLIC_*` are set: `API_URL`,
`CLERK_PUBLISHABLE_KEY`, `BRANDFETCH_CLIENT_ID`, `REVENUECAT_IOS_KEY` and
`SENTRY_DSN`. **`SENTRY_AUTH_TOKEN` is the only one still missing**, and it is the
one that fails the build — see the box below.

Note this command must run from `apps/mobile`; from the repo root eas-cli cannot
find `app.json` and reports "EAS project not configured".

### ⛔ The RevenueCat key must be `appl_…`, even for TestFlight

**An earlier version of this document said the Test Store key (`test_…`) was a
safe shortcut here. It is not, and build 5 proved it.** RevenueCat's own launch
checklist: *"Using a Test Store API key in production will crash your app"*, and
their SDK guidance is explicit — Test Store keys are for **debug builds**,
platform keys (`appl_…`) for **release builds**. A `distribution: "store"`
profile is a release build, TestFlight or not.

The failure is quiet and looks like three separate bugs:
`Purchases.configure` throws, the module-scope try/catch fails open, so the
paywall reports "could not load", `usePro` falls back to a cached `false`, and
**a dashboard grant has nowhere to land** because the SDK never created a
customer for your Clerk id. Nothing reached Sentry until that catch was wired to
`reportError`.

Getting the `appl_` key needs **no IAP product and no Paid Applications
agreement** — RevenueCat mints it the moment the Apple app config exists:

1. App Store Connect → **Users and Access → Integrations → In-App Purchase**
   ([direct link](https://appstoreconnect.apple.com/access/integrations/api/subs))
   → generate a key, download the `.p8`, note the **Issuer ID**.
2. RevenueCat → **Apps & providers → Apple App Store** → app name, bundle id
   `cc.subeye.app`, the `.p8` and Issuer ID.
3. Copy the **public app-specific key** (`appl_…`) from Project settings → API
   keys.

**A "Credentials need attention" badge on step 2 does not block step 3.** The
`appl_` key is issued as soon as the app config saves; the `.p8` only gates
purchase *validation*, and with no products there is nothing to validate. Take
the key, set it, build — sort the credential out before you sell anything.

If that badge says **"Valid key format"** and then **"The key is not valid or is
not compatible with the Bundle ID of your app"**, the usual cause is uploading
the wrong `.p8`: the App Store Connect API key (`AuthKey_….p8`) instead of the
In-App Purchase key (`SubscriptionKey_….p8`). Both live under Integrations and
only one works here. See [PAYMENTS-BRIEF.md](PAYMENTS-BRIEF.md) Part 1 for the
rest of the causes.

```bash
bunx eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_… --visibility plaintext
```

Same value for `preview`. Keep `test_…` in `apps/mobile/.env` only — that is the
debug build, which is exactly where it belongs.

With the `appl_` key and no products configured yet, the paywall correctly shows
`paywall_unavailable` and **dashboard grants work**, because the SDK configures,
`Purchases.logIn(clerkUserId)` succeeds and the customer exists. (`dev.forcePro`
will still not work: `__DEV__` is false in a store build, by design.)

### Sentry, and why this one can fail the build

⚠️ **`SENTRY_AUTH_TOKEN` is now a build requirement, not a nicety.** The Xcode
bundle phase is wrapped by `sentry-xcode.sh`, which runs `sentry-cli react-native
xcode` and returns a non-zero exit code — a hard `error:` in the Xcode log — when
the upload fails. A missing token, a bad token, or a Sentry project that does not
exist yet all end the build at "Bundle React Native code and images". It does not
warn and carry on.

So, in this order:

1. **The project slug in `app.json` must match Sentry exactly.** It is `subeye`
   in org `pe-yhunko` on **de.sentry.io**; `apps/mobile/ios/sentry.properties`
   is generated from `app.json`. Build 4 died on precisely this — the plugin
   said `subeye-mobile`, the project is `subeye`, and sentry-cli answered
   `400 One or more projects are invalid`. A wrong slug authenticates fine and
   then fails the build.
2. **Generate the token** in Sentry → Settings → Auth Tokens, scope
   `project:releases`.
3. Set both variables. The token is a real secret; the DSN is public and only
   grants writing events.

```bash
bunx eas env:create --environment production --name SENTRY_AUTH_TOKEN --value sntrys_… --visibility secret
bunx eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value https://…@…ingest.de.sentry.io/… --visibility plaintext
```

The DSN is genuinely optional — `env.ts` reads it as nullable and the SDK
initialises disabled without it, so leaving it out costs you reporting, not a
boot. The token is the one that stops the build.

**Prove the upload path before you spend a build on it.** This is the exact call
the Xcode phase makes, and it answers in two seconds instead of twenty minutes:

```bash
cd apps/mobile/ios && SENTRY_AUTH_TOKEN=sntrys_… SENTRY_PROPERTIES=sentry.properties ../../../node_modules/@sentry/cli/bin/sentry-cli info
```

It prints the server, org and project it resolved. A `404 not found` there means
the **slug in `app.json` does not match the real project** — check the URL in
Sentry (`de.sentry.io/organizations/pe-yhunko/projects/<slug>/`), fix the
`project` field in the `@sentry/react-native/expo` plugin block, and rerun. EAS
prebuilds from `app.json` in the cloud, so editing it is enough; a local
`prebuild` is only needed to refresh `ios/sentry.properties` on your Mac.

**If you want a build before any of this exists**, opt out rather than half-doing
it — the build then ships with no source maps and every production stack trace is
minified:

```bash
bunx eas env:create --environment production --name SENTRY_DISABLE_AUTO_UPLOAD --value true
```

---

## Step 3 — Regenerate the native project

**Already done** for Sentry — `ios/` was regenerated and the pods installed when
the brief landed. Only rerun this if another native module changes.

```bash
bun run --cwd apps/mobile prebuild
```

If `pod install` dies on `Encoding::CompatibilityError` the prebuild itself still
succeeded; it is a CocoaPods locale problem on this Mac, not an Expo one:

```bash
cd apps/mobile/ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
```

EAS does not care either way — it runs its own prebuild from `app.json`. This
step only matters for building locally.

---

## Step 4 — Build

```bash
bunx eas build --profile production --platform ios
```

The **first** run walks you through credentials. Answer:

- Log in with your Apple ID when asked → yes
- *Generate a new Apple Distribution Certificate?* → **Yes**
- *Generate a new Provisioning Profile?* → **Yes**
- *Set up Push Notifications?* → **No.** SubEye schedules local notifications
  only; there is no APNs key and no server sending pushes.

Then wait 10–25 minutes. Let it finish; the credentials it just created are
reused by every later build.

Version and build number are handled for you: the marketing string comes from
`expo.version` (`4.0.0`) via [app.config.js](../../apps/mobile/app.config.js),
and the build number auto-increments on EAS because `eas.json` sets
`appVersionSource: "remote"`. **Never hand-edit `ios.buildNumber`.**

---

## Step 5 — Upload to App Store Connect

```bash
bunx eas submit --profile production --platform ios --latest
```

`eas.json` now has a `submit.production` block carrying only `appleTeamId`.
That is deliberate: **the profile has to exist or eas-cli refuses outright**
(`Missing submit profile in eas.json: production` — which is also what
`eas build --auto-submit` fails on, *after* queueing the build), while leaving
`ascAppId` out keeps the first run interactive so you can pick the record from
step 1. Ten minutes, mostly upload.

**Do not use `--auto-submit` for the first one.** It runs unattended when the
build finishes and there is nothing there to answer the Apple ID prompt. Once
this has worked once, add `ascAppId` (App Store Connect → your app → App
Information → Apple ID, a number) and `appleId`, and auto-submit becomes usable.

---

## Step 6 — Install from TestFlight

1. App Store Connect → **SubEye → TestFlight**. The build shows as *Processing*
   for 5–30 minutes.
2. If it asks about **export compliance**, it should not — `app.json` sets
   `usesNonExemptEncryption: false`. If it asks anyway, answer that you use only
   standard HTTPS.
3. **Internal Testing** → create a group → add yourself. Internal testers need
   no Beta App Review and no waiting; the build is installable the moment
   processing ends.
4. Install TestFlight on the phone, accept, install SubEye.

External testers (anyone not in your Users and Access list) do need a Beta App
Review, roughly a day. You do not need them yet.

---

## Step 7 — What to actually test

The full list is **M6** in [MANUAL-CHECKLIST.md](MANUAL-CHECKLIST.md). The five
that have never once been exercised, in priority order:

1. **Sign-in against the deployed API.** Every previous run pointed at a LAN
   wrangler dev server. This is the first time the app talks to
   `app.subeye.cc` with a `pk_live_` Clerk key — if the Worker's
   `CLERK_SECRET_KEY` is a test key, every request 401s and you will find out
   here.
2. **Sign in with Apple**, including "Hide My Email". Never run end to end.
3. **Notification permission** and a scheduled reminder actually arriving.
4. **The Pro gates** — grant yourself `pro` in RevenueCat (Customers → your
   Clerk user id → Entitlements → Grant → until 2099) and confirm reminders,
   the pricing timeline, and all four category surfaces unlock.
5. **The `/uk/` legal links** from Settings, with the phone's per-app language
   set to Ukrainian.

---

## When it goes wrong

| Symptom | Cause |
| --- | --- |
| App opens to the crash screen immediately | A missing `EXPO_PUBLIC_*` in the EAS `production` environment. `env.ts` throws at module load. |
| Every API call 401s | The Worker's Clerk secret and the app's `pk_live_` publishable key are from different instances. |
| Build fails on credentials | Delete the EAS-managed credentials and let it regenerate — do not hand-manage profiles. |
| `eas submit` cannot find the app | Step 1 was skipped, or the bundle id on the record does not match `cc.subeye.app` exactly. |
| Build stuck in *Processing* over an hour | Usually an invalid icon or a missing entitlement. Check the email Apple sends; it is more specific than the dashboard. |
| Paywall shows nothing | Expected on the Test Store key with no products configured. Not a bug yet. |
| Build fails at "Bundle React Native code and images" with `error: sentry-cli` | Read the status code it prints. `400 One or more projects are invalid` = the slug in `app.json` is not a real project (this killed build 4). `401`/auth = `SENTRY_AUTH_TOKEN` missing or wrong in the EAS environment. |
| Crashes arrive in Sentry with minified frames | The bundle uploaded but its map did not, or `metro.config.js` stopped using `getSentryExpoConfig` (no Debug ID = no pairing). |
| No crashes arrive at all | `EXPO_PUBLIC_SENTRY_DSN` is unset in the EAS environment. By design that boots fine and reports nothing. |

---

## After this works

In order: swap the RevenueCat key to `appl_`, then the Paid Applications
agreement, the IAP product, and M5's privacy label and screenshots. All of it is
easier once the app is on your phone.
