# Getting SubEye onto TestFlight — the short path

The goal here is **one build, on your phone, through TestFlight**. Nothing else.

Deliberately **not** in this document, because none of it is required to install
a TestFlight build: the Paid Applications agreement, the in-app purchase product,
RevenueCat's Apple configuration, screenshots, the App Privacy label, the store
description, or App Review. Those belong to submission ([MANUAL-CHECKLIST.md](MANUAL-CHECKLIST.md)
M5 and M8), and every one of them is easier to do once you have seen the app run
on a real device.

Do [SENTRY-BRIEF.md](SENTRY-BRIEF.md) **first** if you are doing it at all — it
adds a native module, and batching it here costs nothing while doing it after
costs a whole build cycle.

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

Three are already set (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`EXPO_PUBLIC_BRANDFETCH_CLIENT_ID`). The one that is missing:

```bash
bunx eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value test_YOUR_TEST_STORE_KEY
```

**Use the Test Store key (`test_…`) — the one already in `apps/mobile/.env`.**
This is a deliberate shortcut and it is safe:

- `Purchases.configure` is wrapped in a try/catch that fails open, so no key can
  brick the boot.
- The Test Store still belongs to your RevenueCat project, so signing in on the
  TestFlight build creates a real customer record — which means you can **grant
  yourself `pro` from the RevenueCat dashboard** and exercise every gated
  feature. (`dev.forcePro` will not work: `__DEV__` is false in a TestFlight
  build, by design.)
- The paywall will show either Test Store products or `paywall_unavailable`.
  Both are correct for a build that is not selling anything.

**Swap it for the `appl_…` key before you submit to review.** A Test Store key in
a shipped binary sells nothing.

If Sentry landed, also add the auth token as a **secret**:

```bash
bunx eas env:create --environment production --name SENTRY_AUTH_TOKEN --value sntrys_… --visibility secret
```

---

## Step 3 — Regenerate the native project

Only needed if a native module changed since the last prebuild — Sentry counts,
RevenueCat already landed.

```bash
bun run --cwd apps/mobile prebuild
```

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

`eas.json` has no `submit` block, so this asks interactively for your Apple ID
and the app to submit to — pick the record from step 1. Ten minutes, mostly
upload.

Once this works, adding the `submit` block to `eas.json` is worth it so the next
one is non-interactive. It needs the `ascAppId`, which only exists after step 1
(App Store Connect → your app → App Information → Apple ID, a number).

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

---

## After this works

In order: swap the RevenueCat key to `appl_`, then the Paid Applications
agreement, the IAP product, and M5's privacy label and screenshots. All of it is
easier once the app is on your phone.
