# B6 — SubEye Pro: RevenueCat, the paywall, and the entitlement

Everything needed to ship the one in-app purchase, in the order it has to
happen. Parts 1 and 4 are dashboard work only Yehor can do; part 2 is the Claude
Code session; part 3 is how to prove it works without shipping to the store.

Read [SESSION-BRIEFS.md](SESSION-BRIEFS.md) for what else is outstanding and
[MANUAL-CHECKLIST.md](MANUAL-CHECKLIST.md) for the release steps around this one.

---

## The model — decided, do not redesign

**One non-consumable, `$11.99`, lifetime.** Per-storefront (~₴199 in Ukraine, on
Apple's default conversion). Not a launch price, no promo codes, no
auto-renewable subscription in v1 — Guideline 3.1.2's paywall requirements,
dunning and grace periods are ops a solo developer does not need on day one, and
a subscription tracker charging a subscription is a joke reviewers make in
public.

| Free, forever | Pro |
| --- | --- |
| Unlimited subscriptions | Renewal reminders |
| The whole Home dashboard | Pricing phases — trial / intro / scheduled change |
| List, search, filter, sort | Categories, the breakdown and the filter |
| Every lifecycle action | |
| Multi-currency at daily rates | |

The gate is **features, not a count cap**. Nothing gated costs anything at
runtime, so the free tier cannot be griefed into a bill and the cap never
punishes the users who evangelise the app.

**There is no CSV export.** It is not built, it is not on the landing page, and
it must not appear in the paywall, the store listing or the catalogs. Earlier
drafts of the B6 brief listed it; they were wrong.

The prices live in one place on the marketing side —
`apps/landing/src/lib/site.ts` exports `proPrice = { usd: 11.99, uah: 199, eur:
9.99 }`. The app must read its price from the RevenueCat `Package`, never
hardcode it: the storefront decides, and a hardcoded `$11.99` is wrong in
Ukraine and illegal-looking everywhere else.

---

## Part 1 — Dashboard setup (Yehor, before the session starts)

The session cannot begin until there is a product id to point at. Small Business
Program is already enrolled.

### 1a. App Store Connect

1. **Agreements, Tax, and Banking** → the **Paid Applications** agreement must be
   *Active*, with banking and tax complete. This takes days, not minutes, and
   **nothing about IAP works until it is** — products stay in "Missing Metadata"
   and the SDK returns an empty offering with no useful error.
2. The app record must exist (manual step **M5**).
3. **In-App Purchases** → new **Non-Consumable**:
   - Product ID `cc.subeye.app.pro.lifetime`
   - Reference name `SubEye Pro (Lifetime)`
   - Price **$11.99** (Apple's default per-storefront conversion — do not hand-set ₴)
   - Localized display name + description in **en** and **uk**
   - Leave it at "Ready to Submit". It does **not** need review approval to be
     purchasable in sandbox.
4. **Users and Access → Integrations → In-App Purchase** → generate an **In-App
   Purchase Key**, download the `.p8` (one download only), and note the **Issuer
   ID** shown at the top of that page. If no Issuer ID appears, create an App
   Store Connect API key and it will.

   ⚠️ **Two different `.p8` keys live under Integrations and they are not
   interchangeable.** The App Store Connect API key downloads as
   `AuthKey_XXXXXXXXXX.p8`; the In-App Purchase key
   ([direct link](https://appstoreconnect.apple.com/access/integrations/api/subs))
   downloads as `SubscriptionKey_XXXXXXXXXX.p8`. Upload the API key by mistake
   and RevenueCat reports **"Valid key format"** followed by **"The key is not
   valid or is not compatible with the Bundle ID of your app"** — it passes the
   format check and fails everything after. That exact pair of messages cost an
   afternoon on 2026-07-29. The other causes of it, in order: a bundle id that
   is not character-for-character `cc.subeye.app` (capitalization counts, and a
   pasted trailing space is invisible), a wrong Issuer ID, and a revoked key.

### 1b. RevenueCat

1. Create the project. **Apps & providers → App config → Apple App Store**:
   name, Bundle ID `cc.subeye.app`, the **In-App Purchase Key** (.p8 + Issuer
   ID), and the **App Store Connect API key** so products can be imported
   directly.

   The `appl_…` public SDK key is issued the moment this config saves — a red
   "Credentials need attention" badge does **not** withhold it. That key is all
   a build needs to boot and to receive dashboard grants; the In-App Purchase
   Key only matters once there is a purchase to validate. Do not let a bad `.p8`
   block a build.
2. **Apple Server-to-Server notifications** → click *Apply in App Store Connect*.
   It writes both the Production and Sandbox URLs for you. Without this,
   refunds and Apple-side changes never reach RevenueCat.
3. Import the product, then create:
   - **Entitlement** id `pro` (this exact string is what the client checks)
   - **Offering** `default` with one **Package**, type *Lifetime*, attached to
     `cc.subeye.app.pro.lifetime`
4. Copy two keys: the **Apple public SDK key** (`appl_…`) and the project's
   **Test Store key** (`test_…`). Both go to the session — the second is what
   makes development possible before any of 1a is finished.

Hand the session: both keys, the product id, the entitlement id `pro`.

---

## Part 2 — The implementation

> Paste from here down into a fresh Claude Code session.

Add SubEye Pro to `apps/mobile` via RevenueCat. The model above is decided —
implement it, do not redesign it.

### Dependency and native build

`react-native-purchases` (`bunx expo install react-native-purchases`). It is a
native module: it needs `bun run --cwd apps/mobile prebuild` and a fresh dev
client build. **Batch it with brief B3 (crash telemetry) if that has not landed
yet** — two native additions, one build cycle.

Do not hand-roll StoreKit.

### Configuration

`src/shared/config/env.ts` validates at module load and throws before React
renders a frame. Add the key there as **required** — a paywall that silently
fails to configure is worse than a boot error:

```
EXPO_PUBLIC_REVENUECAT_IOS_KEY
```

Then add it to `apps/mobile/.env` (the `test_…` key for local work) and note in
the commit message that `eas env:create` is needed for `production` **and**
`preview` with the `appl_…` key before any store build.

Configure once at app start, in `src/app/_layout.tsx`, with
**`appUserID: null`**.

> **Superseded by the offline flip (v5).** This brief was written while Clerk
> existed, and it went on to say the app should call `Purchases.logIn(clerkUserId)`
> once a session resolved, so that the RevenueCat app user id **was** the Clerk
> user id. Accounts are gone: `entities/pro/model/purchases.ts` configures with
> `appUserID: null` and never calls `logIn` or `logOut`, so **the app user id is
> an anonymous, device-local `$RCAnonymousID:…`**. A purchase is tied to the
> Apple Account that paid for it and is recovered with Restore purchases, not by
> signing in. Part 4 below is affected: there is no Clerk id to search the
> dashboard by.

### The entitlement

One hook, one source of truth — something like
`src/entities/pro/model/use-pro.ts` (new FSD entity; it owns state that outlives
a screen and is consumed by several).

- Read `customerInfo.entitlements.active["pro"]`.
- **Cache it in MMKV** via the existing typed door: `deviceFlags` in
  `src/shared/lib/mmkv.ts` already does exactly this for
  `notifications.renewalReminders`. Reuse it — do not add a second storage
  wrapper. A cold start with no network must not downgrade a paying user to
  free.
- **Fail open.** A RevenueCat outage, a thrown SDK call, a null `customerInfo` —
  all resolve to the last cached value, and an uncached user stays free without
  an error screen.
- Entitlement is **client-side only**. `users` gets no new column. A cracked
  client getting free on-device reminders costs nothing, and a server check
  would put a paywall in the money path for no benefit.

### The paywall

A root-level modal route so every gated surface can `router.push("/paywall")`.
The existing pattern to copy is `app/(tabs)/subscriptions/form/` —
`presentation: "modal"` over its own `Stack`.

- Price string comes from the `Package` (`pkg.product.priceString`). Never
  hardcode.
- Purchase via `Purchases.purchasePackage(pkg)`; treat
  `ErrorCode.UserCancelledError` as a no-op, not an error toast.
- **"Restore purchases" is mandatory** (Guideline 3.1.1). Put it *both* inside
  the paywall and in Settings — a reviewer who cannot find it rejects the build.
- The paywall must link Terms and Privacy. `src/shared/config/legal.ts` exports
  `termsUrl()` and `privacyUrl()`, already locale-aware.
- Strings in **both** `messages/en.json` and `messages/uk.json`, then
  `bun run --cwd apps/mobile i18n:generate`. Access as `m.paywall_*()`.

### What to gate, and where it actually lives

**Renewal reminders** — the Settings toggle (`RenewalReminders` in
`src/widgets/settings-page/ui/settings-page.tsx`) and the scheduling itself in
`src/shared/lib/notifications/index.ts`.

> **Grandfather anyone already on.** `deviceFlags.get("notifications.renewalReminders")`
> being `true` means that install had reminders before the paywall existed;
> those keep working. Say so in the commit message.

**Pricing phases** — `src/widgets/manage-pricing-sheet/` (creating a trial,
intro or scheduled change) and the timeline on
`src/widgets/subscription-detail/ui/subscription-detail-page.tsx`. The server
keeps computing phases either way; this is a client gate only.

**Categories — four surfaces, not three.** Grep before you assume:

1. Settings → Categories (`settings-page.tsx` row → `src/widgets/categories-page/`)
2. The filter sheet's category filter (`src/widgets/subscription-filters-sheet/`)
3. Home's category breakdown (`src/widgets/home-page/ui/category-bars.tsx`)
4. The form's category picker (`src/widgets/subscription-form/ui/category-picker-page.tsx`)

Gate all four consistently and deep-link each to the paywall rather than hiding
some and disabling others — a feature that half-exists reads as a bug. There are
no existing users to strand, so no migration concern.

### Privacy manifest

RevenueCat collects purchase history. Add
`NSPrivacyCollectedDataTypePurchaseHistory` (linked, not tracking, App
Functionality) to `expo.ios.privacyManifests` in `apps/mobile/app.json`, and
note it so the **App Privacy label** in App Store Connect gains the matching row
— M5's table is otherwise complete and would then be wrong.

### Gates

`bun run type-check`, `bun run test`, `bun run check:boundaries` before calling
it done. A new `entities/pro` slice must not import from `widgets/` — the FSD
layer rule is enforced by dependency-cruiser, not suggested.

---

## Part 3 — How to test, and what build each tier needs

**No production build is needed to test purchases.** Three tiers, cheapest
first:

### Tier 1 — RevenueCat Test Store (during development)

The `test_…` key. Products and offerings live in RevenueCat's own Test Store; no
App Store Connect product, no sandbox Apple ID, no Paid Apps agreement. Purchases
involve no money and complete instantly.

Runs in the **dev client** — simulator or device, whatever is already in hand.
This is how the paywall, the entitlement hook, the gates and the restore flow
get built.

```bash
bun run --cwd apps/mobile ios      # dev client, EXPO_PUBLIC_REVENUECAT_IOS_KEY=test_…
```

Its limit is exactly what it says: it never touches Apple, so it proves nothing
about receipt validation, the real product id, or the price the storefront
shows.

### Tier 2 — Apple sandbox (before submission, mandatory)

Switch to the `appl_…` key. Needs: the IAP in App Store Connect at "Ready to
Submit", the **Paid Applications agreement active**, and a **Sandbox Apple
Account** (App Store Connect → Users and Access → Sandbox → Test Accounts; then
on the phone, Settings → Developer → Sandbox Apple Account).

**A real device is required — the simulator cannot buy a real ASC product.**
TestFlight is *not* required: a development or internal-distribution EAS build
signed with `cc.subeye.app` is enough.

```bash
bunx eas build --profile development --platform ios
```

Sandbox purchases are free and repeatable. This is the tier that proves the
product id, the price string, receipt validation and restore all work.

The failure mode to expect: an empty offering. It is almost always the Paid Apps
agreement, a product id typo, or the IAP still in "Missing Metadata" — not the
code.

### Tier 3 — TestFlight (final rehearsal)

A `--profile production` build through TestFlight uses sandbox billing too, but
exercises the exact binary and signing that goes to review. Do the last pass
here, and take the **review screenshot of the purchase screen** that App Store
Connect requires for a non-consumable — it can only be taken once the paywall
exists.

### The StoreKit configuration file

Xcode's local StoreKit config can fake products in the simulator, but RevenueCat
cannot validate those receipts server-side, so entitlements do not flow. Use
Tier 1 instead; it is the supported path and needs no Xcode scheme editing.

---

## Part 4 — Giving yourself Pro

### Production and sandbox — the sanctioned way

RevenueCat dashboard → **Customers** → find your customer → the
**Entitlements** card → **Grant** → `pro` → *Until date*, pick something absurd
like 2099-01-01 since this is a lifetime product.

Since v5 the app user id is anonymous (`$RCAnonymousID:…`), so there is no
account id to search by. Sort Customers by *Last seen* and pick the one from the
device you just opened, or read the id off the device — `Purchases.getAppUserID()`
returns it.

It takes effect immediately, but the client caches `CustomerInfo` — refresh it
in-app (or cold-start) to see it. Granted entitlements are prefixed `rc_promo`
and **work in both sandbox and production apps**. To remove one early, use the
menu next to it — with the dashboard's **"Sandbox data" toggle unchecked**, or
it only removes the sandbox half.

Scriptable equivalent, if you would rather not click:

```bash
curl -X POST "https://api.revenuecat.com/v2/projects/$PROJECT_ID/customers/$APP_USER_ID/actions/grant_entitlement" \
  -H "Authorization: Bearer $RC_SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"entitlement_id":"'"$ENTITLEMENT_ID"'","expires_at":4070908800000}'
```

Revoke with `.../actions/revoke_granted_entitlement` and the same
`entitlement_id`.

### Development — a local override

Add a `__DEV__`-guarded escape hatch so the gates can be flipped without a
network round trip: a hidden row at the bottom of Settings that toggles a
`deviceFlags` boolean the `usePro` hook ORs in.

```ts
// ponytail: dev-only, and __DEV__ is what keeps it out of a release bundle.
const isPro = entitled || (__DEV__ && deviceFlags.get("dev.forcePro"));
```

It must be `__DEV__`-guarded, not env-guarded — a flag that can be enabled by
configuration is a flag that ships enabled one day.

### Do not

Grant yourself Pro by buying it with your own Apple ID in production. Apple's
commission applies, and the Small Business Program rate does not make it free.
Sandbox purchases cost nothing and exercise more of the path anyway.

---

## Definition of done

- [ ] Paywall opens from every gated surface, shows the storefront's own price
- [ ] Purchase in the Test Store flips all four gate groups
- [ ] Purchase in Apple **sandbox on a real device** does the same
- [ ] Restore works from Settings and from the paywall, after a reinstall
- [ ] Airplane mode on a cold start leaves a paying user Pro
- [ ] An install that already had renewal reminders on keeps them
- [ ] `messages/uk.json` has every new key
- [ ] `app.json` privacy manifest gains purchase history; M5's label row noted
- [ ] type-check, test, check:boundaries green
