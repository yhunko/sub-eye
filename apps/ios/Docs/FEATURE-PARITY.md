# Native iOS parity audit

Audit baseline: 2026-09-15, branch dev, 24 commits ahead of origin/dev.
Existing modified mobile configuration, navigation, review, plugin and lockfile
changes were present before this work and are outside the native rewrite.

This checklist was written before implementation and is retained as the audit
baseline. Checkboxes below describe implementation; they do not certify real
Apple-service behavior or release readiness. Physical acceptance remains open
in [MIGRATION-RELEASE.md](MIGRATION-RELEASE.md). Validation evidence is listed at
the end and in [PERFORMANCE.md](PERFORMANCE.md).

## Authoritative surfaces

Source: apps/mobile/src/app routes; widgets/* page implementations; entities;
shared/lib/{store,notifications,widget,logos}; all nine domain/store packages.
The September 16 user correction makes the Expo UI the visual reference too.
See [visual parity](VISUAL-PARITY.md) for the replacement of the initial generic
native layout and its validation record.

- [x] Native Home: current-month payment rail, decisions (trial/offer endings,
  price changes, cancellation and resume), remaining/month/next-month figures,
  largest subscription, spending breakdown. Free groups by subscription; Pro
  groups by category. Paused-only data must not appear as a new install.
- [x] Subscription list: preferred-currency monthly run rate and annual forecast;
  search name/category; active (includes cancelling), all, paused, cancelling,
  ended; category filter; next/name/cost sorting; none/category/period/currency
  grouping with monthly section totals. Persist options, not search.
- [x] Create/edit: brand search and manual entry, logo variant selection,
  localized decimal entry, 156 fiat currencies, custom every-N day/week/month/
  year cadence, initial payment day, optional trial/intro end and standard price,
  category picker/create. Draft lifetime belongs to the sheet.
- [x] Details: identity, current and next-charge price, exact lifecycle event,
  category, timeline; preserve cancellation/phase boundaries and action legality.
- [x] Lifecycle: immediate/end-of-period cancellation, keep an existing winding
  down subscription without shifting its anchor, restart an ended one on a
  chosen past day, indefinite/dated pause, resume. Confirm destructive actions.
- [x] Pricing (Pro): schedule next-occurrence/custom-date change, temporary
  zero/discounted price for N charges from now/next payment, pending review,
  apply now, remove pending, end offer early. Cancellation preserves phases.
- [x] Calendar: month paging, today, day totals/logos, complete agenda with
  renewal/trial/intro/price/cancellation/resume events; Monday/Sunday preference
  and day-total toggle. Pro adds previous-month delta, heavy day and year heatmap.
- [x] Categories (Pro): search/select/create/edit emoji and name; deletion leaves
  subscriptions uncategorized. Existing assigned categories remain readable.
- [x] Currency conversion: lowercase codes, USD seed/cache, cross-rates, exact
  occurrence pricing, stale offline rates, deferred daily refresh and retry cap.
- [x] Notifications: default off; renewal reminders remain free at one-day lead;
  Pro extra 0/1/3/7 lead times and trial warnings; device-local time, permission,
  test reminder and health/status. Safe permanent repeat rules, three-occurrence
  fallback, digest grouping, 56-request budget, no past immediate triggers.
- [x] Settings: Pro status, purchase/restore, preferred currency, device timezone,
  categories, notifications, OS language settings, iCloud opt-in, erase, rating,
  version and Ukrainian identity.
- [x] iCloud: free, default off, per-record change notifications, initial union,
  explicit deletions only, quota failure surfaced, account-change disables sync.
- [x] Widget: small/medium; SAME extension identity/kind and snapshot v1 key.
  Current source (newer than the prose in mobile/CLAUDE.md): free shows monthly
  total, omits names/dates/item prices; Pro shows renewals/delta. Locale-aware
  relative calendar days, next-local-midnight refresh, deduplicated publication.
- [x] RevenueCat: entitlement `pro`; anonymous customer; lifetime package from
  current offering; cached confirmed entitlement survives network failure;
  purchase cancellation is neutral, restore reports found/none/failure distinctly.
- [x] Logos: offline bytes, per-domain icon/symbol/logo choice, image validation,
  Brandfetch ladder then supported fallback, bounded disk/memory caches, erase.
- [x] Legal: native rendering of shared English/Ukrainian privacy/terms content.
- [x] Routing: subeye:///subscriptions/<id>, subscriptions/due/<day>, calendar,
  paywall and notification cold-launch routes; a usable back path everywhere.
- [ ] English/Ukrainian, OS language switching, Dynamic Type at largest size,
  VoiceOver, high contrast, Reduce Motion/transparency, 44-point targets.
- [x] Erase: subscriptions/phases/categories, pending notifications, widget,
  logos/choices, memory state and enabled cloud records; avoid re-importing the
  retained legacy migration source after an explicit erase.
- [x] Import/export: the current shipped Expo client has NO import/export UI
  (settings exposes sync and erase only). Native JSON archive import/export is
  useful for recovery and migration verification; preserve StoreDoc v1 contract.
- [x] Developer-only demo/pro override and reminder prompts/review throttling
  must never grant Pro or seed demo data in a production binary.

## Additional native requirements

- [x] Swift 6 concurrency; SwiftUI scene lifecycle, native tab/navigation/search.
- [x] Native-only app and extensions; no React Native/Expo/Hermes/JS/web UI.
- [x] Local model first; external services only after usable frame.
- [x] Renewal Live Activities, default off under Settings → Notifications;
  explain system permission, privacy, group same-day renewals, bounded lifetime.
- [x] iOS 27 scheduled ActivityKit request; earlier OS uses local notifications.
  The installed Xcode 27 SDK exposes the `start:` request (marked iOS 26); the
  product gate remains iOS 27 as requested.
- [x] Keep acknowledges only and ends the activity; Cancel opens cancellation
  planning/provider instructions and requires confirmation before local mutation.
- [x] Versioned, resumable, idempotent migration; legacy inputs never overwritten.
- [x] Release build, domain/repository/migration/launch/UI tests.
- [ ] Physical-device Release installation, standalone launch, offline CRUD,
  search/calendar/settings, widget/cloud/purchase/Live Activity verification.
- [ ] Signposts, physical cold/warm launches and scroll measurements, ETTrace/
  Instruments evidence and memory/retain-cycle inspection with realistic data.

## Exact legacy storage contract

React Native MMKV 4.3.2 uses native MMKV files in Documents/mmkv unless the old
Info.plist has AppGroupIdentifier (the shipped generated plist must be checked).
The default instance id is `mmkv.default`. The old app has no encryption key.

| Instance / surface | Keys and payload |
| --- | --- |
| subeye.store | subeye.doc.a, subeye.doc.b: JSON StoreDoc; subeye.doc.active points at one slot (defaults a). Read active, then other on parse failure. |
| StoreDoc | v:1; preferences object; categories[], subscriptions[], phases[]. Older docs merge missing prefs/arrays with defaults. Unknown future versions must not be silently rewritten by native. |
| Subscription | id,name,cost:string,currency:lowercase,every,period,status,autoPaid,categoryId?,notes?,brandDomain?,paymentDate,willBeCancelledAt?,pausedAt?,resumeAt?,createdAt,updatedAt |
| Phase | id,subscriptionId,kind,cost:string,currency,startsAt,endsAt?,appliedAt?,createdAt,updatedAt |
| Category | id,name,emoji,createdAt,updatedAt |
| Preferences | preferredCurrency,preferredTimezone,dateFormat,locale,theme |
| mmkv.default | cloud.sync boolean; pro.entitled boolean; dev.forcePro boolean (never migrate to release); notifications.settings JSON; notifications.renewalReminders legacy boolean; subs.filters JSON; calendar.settings JSON; prompt/review state (inventory retained in migration report). |
| subeye.fx | subeye.fx.usd: {base:"usd",rates,rateDate}; subeye.fx.checkedAt ISO last attempt |
| subeye.logos | symbol:<auto/icon/symbol/logo>:<domain>, plate:auto:<domain>; {uri:data-URI-or-null,plate,aspect,at:epoch-ms}. Older entries can lack aspect. |
| subeye.logo-variants | <domain>: icon / symbol / logo |
| App Group | group.cc.subeye.app UserDefaults string `snapshot`: WidgetSnapshot v1, already formatted/translated; not a complete backup. |
| iCloud KV | $(TeamIdentifierPrefix)cc.subeye.app; prefs, sub.<id>, cat.<id>, phase.<id>, each a JSON string. Absence is deletion only for explicitly changed keys. Budget 1000 keys; Apple 1 MB quota. |

Migration must retain raw values and source hashes as well as validated records.
Corrupt/unsupported data must produce a recoverable migration error, not an empty
store or partially successful import. The new transaction and migration marker
commit together; retry after interruption is safe.

## Environment discovered

- Xcode 27.0, build 27A266a, iPhoneOS27.0 SDK.
- Connected physical iPhone: iOS 27.0, device identifier
  8E9E582B-7667-5520-A2FA-F6FCD2E537DB (model/signing measured later).
- Existing app deployment target 16.4; widget 18.0.
- Team Z6KADG969Z; production cc.subeye.app / cc.subeye.app.widget.

## Evidence status

Implemented source covers the audited product surfaces. Physical services and
manual accessibility acceptance remain unverified. This document is not release
approval.

| Area | Evidence | Still required |
| --- | --- | --- |
| Recurrence, money, pricing, lifecycle, reminders | 25 Release core tests; 76 shared TypeScript/Swift vectors | Real-data upgrade comparison |
| Migration and repository | Current/older unsorted documents; interruption/retry, corruption, readback and conflict/outbox tests; real binary MMKV source hashes | Existing installed Expo container upgrade |
| Native UI | Physical CRUD/search/calendar/settings, picker/recurrence and day-routing UI tests, 14/14 on iOS 18, largest-text audit, accepted main visual rewrite | Physical VoiceOver, Reduce Motion and increased contrast |
| Launch and scrolling | Physical process-launch/foreground metrics and standalone launch; simulator scroll metrics, ETTrace and same-process memory graphs | Physical offline cold launch, scrolling hitches and traces |
| Apple services | Native notification/ActivityKit/WidgetKit/iCloud adapters and RevenueCat SDK compile | Actual scheduling, widget placement, cloud reconciliation and StoreKit sandbox purchase/restore |
| Production identity | Signed Production build installed with original IDs/contracts and launched standalone | Final App Store archive validation |

The main visual rewrite passed 10/10 tests on iOS 26.5. The earlier iOS 18 run exposed a
UICollectionView self-sizing recursion in the calendar's lazy grid; a bounded
eager Grid fixed the crash and passed the primary flows. The largest-text audit
checks visible content while excluding contrast samples from offscreen content
and content beneath native translucent navigation/tab bars.

The app's actual 12-subscription / 9-category MMKV backup also passed native
migration and complete keyed-record comparison in an isolated simulator store.
The revised production-identity build is signed and installed on the iPhone 17;
XcodeBuildMCP launched it standalone successfully on September 16 (PID 6289).
Device UI, service and profiling gates are recorded in the release handoff.

Intentional native contract fixes are recorded in the migration handoff. No Expo
or Android source was changed by this implementation.
