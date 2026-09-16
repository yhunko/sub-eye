# Native migration and release handoff

Status: optimized Production build signed and installed; **not approved for
release** until the physical-device gates below pass. Do not delete the
installed Expo app to prepare an upgrade: uninstalling destroys its private
MMKV source.

## Identities and paths

| | Debug / Release | Production (archive) |
| --- | --- | --- |
| App | `cc.subeye.app.native` | `cc.subeye.app` |
| Widget | `cc.subeye.app.native.widget` | `cc.subeye.app.widget` |
| URL scheme | `subeyenative` | `subeye` |
| App Group | `group.cc.subeye.app` | `group.cc.subeye.app` |
| Group database | `native-development/SubEye.sqlite` | `native/SubEye.sqlite` |
| Widget UserDefaults key | `snapshot.native-development` | `snapshot` |
| iCloud KV suffix | `cc.subeye.app.native` | `cc.subeye.app` |

The shared App Group does not make the Expo app's private Documents directory
readable by the development app. Only an **in-place production-identity upgrade**
has the existing private container. The checked-in generated Expo Info.plist
has no `AppGroupIdentifier`; its MMKV source is `Documents/mmkv`. Verify that
fact against the actual distributed build before rollout.

## First native launch

1. Render native navigation and the bounded presentation cache when available.
2. Open the WAL SQLite store on its actor. Check the versioned migration receipt.
3. If no receipt exists, copy the five legacy MMKV instances and their `.crc`
   files into a fresh `legacy-copies/<UUID>` directory in the native namespace.
   Compute SHA-256 over the copied source bytes. The originals are never opened
   for writing. Validate MMKV metadata bounds and payload CRC before decoding.
4. Read `subeye.doc.active`, then its chosen `subeye.doc.a`/`.b` slot; use the
   alternate only when the chosen slot cannot decode/validate. Reject unknown
   document versions. Normalize supported older documents' missing fields.
5. In one SQLite transaction, write records, settings, preserved raw legacy
   values and source fingerprint. Read records back by identity, validate them,
   run SQLite `quick_check`, and commit the migration receipt with the data.
6. Produce the complete local presentation and atomic bounded launch cache.
   Only afterward reconcile enabled cloud records, refresh rates and RevenueCat,
   publish widgets, and schedule notifications/activities.

A kill before commit rolls the transaction back; the next launch retries from
retained files. A committed receipt prevents re-importing old data over native
edits. Corruption errors remain visible and retryable. Do not resolve them by
deleting the source or silently creating a new store.

The native MMKV dependency has no React Native runtime. Its upstream file-validity
helper uses an old length header for newer metadata; `MMKVIntegrity` checks the
actual metadata version/length and CRC instead. A binary migration test proves
that both source files remain byte-identical after reading their copies.

## What is preserved

The [audited storage inventory](FEATURE-PARITY.md#exact-legacy-storage-contract)
lists the precise instances and keys. Preserve subscription/category/phase IDs,
cost strings, date fields, preferences, cached confirmed Pro entitlement,
notification/list/calendar settings, cloud opt-in, logo variants/bytes, cached
exchange rates and prompt/review state. `dev.forcePro` is deliberately excluded.
The new Live Activity privacy toggle starts off.

Widget kind `SubEyeWidget`, production extension identity and snapshot v1 remain
compatible. Native optional logo filenames extend that snapshot without changing
its version; old readers ignore the added field. Free snapshots omit individual
subscription names, dates and prices. Development snapshots use separate keys
and logo directories.

iCloud remains record-based: `prefs`, `sub.<id>`, `cat.<id>`, `phase.<id>`. Initial
linking unions records; change notifications apply only their stated keys.
Pending local mutations and explicit deletion tombstones remain in a persistent
outbox until acknowledged. A stale acknowledgement cannot clear a newer write.
The adapter surfaces quota/account errors rather than replacing a whole document.

Explicit data deletion commits local deletion and cloud tombstones first, then
cleans notifications, activities, widgets, logo/cache files and retained MMKV
sources. The receipt survives so deleted records cannot be re-imported. If cloud
delivery fails, the UI says local deletion succeeded and cloud deletion is queued.
This operation is not a promise of forensic secure erasure from system backups.

## Contract improvements in native

- Month-end temporary offers revert on an actual renewal anchored to the original
  payment date. Example: January 31 anchor, two discounted charges starting in
  February → February 28 and March 31 discounted, April 30 standard. The existing
  TypeScript offer helper derives its boundary from February 28, ending April 28;
  the native fix preserves the number of charges and aligns the displayed date.
- Permanent calendar notification repeats are used only when they preserve the
  original recurrence. Month-end, leap-year and unsafe lead-day rules use finite
  occurrence requests; future anchors cannot produce premature notifications.
- Removing a pending temporary offer removes its associated reversion too.

The 76 shared vectors still verify recurrence, FX/monthly conversion, lifecycle
status, phase windows and pause boundaries against TypeScript. Separate native
regressions cover the corrected offer and reminder cases above. Android source
was not modified as part of this rewrite.

## Release sequence and rollback

1. Finish the development-identity Release checks on the connected iPhone.
2. Preserve a recoverable backup of the existing app container/record data before
   testing the production-identity upgrade. Record old subscription/category/
   phase counts and representative prices, lifecycle states and logo choices.
3. Set a **monotonically higher build number** for the actual App Store release;
   the scaffold uses 5.3.1 (1), which is not a release-number decision.
4. Archive `SubEye` / `Production` with the existing production app/extension
   identities and team. Keep App Groups, iCloud KV, URL scheme, widget kind,
   public RevenueCat SDK key and entitlement `pro` aligned with the existing app.
5. Install as an upgrade, never uninstall/reinstall. Launch without Xcode attached
   and without network. Compare migrated records and confirm the receipt. Relaunch
   and confirm native edits survive without duplicate import.
6. Validate the service and accessibility gates below, then distribute through
   the existing App Store Connect iOS app. Keep Android's Expo pipeline intact.

The old MMKV files are a pre-upgrade recovery source, **not a reverse sync** of
subsequent native edits. Reinstalling an older Expo binary after native editing
can therefore show stale data. Export the native StoreDoc v1 JSON archive and
preserve the SQLite database/WAL before rollback; plan a forward repair or an
explicit reverse migration. Never promise an automatic lossless binary rollback.

## Physical-device acceptance — still required

- [x] Release signed, installed and launched standalone on the connected iPhone.
- [ ] Actual installed Expo data survives an in-place production upgrade.
- [x] Browse/search/create/edit/delete/calendar/settings on the physical device.
- [ ] Offline cold and warm launch with network disabled.
- [ ] Small/medium widget placement, free privacy, Pro renewals and deep links.
- [ ] Real notification permission/test delivery and renewal schedule health.
- [ ] iCloud two-device initial union, updates, deletion and offline retry.
- [ ] RevenueCat sandbox lifetime purchase, restore, cancel and offline entitlement.
- [ ] iOS 27 scheduled renewal-day activity, same-day grouping and privacy off.
- [x] Single-renewal Lock Screen presentation: glass, logo/name/amount row and
  fully visible Keep/Cancel buttons. Existing-activity layout refresh is versioned.
- [ ] Keep acknowledges without changing billing; Cancel opens planning and local
  state changes only after confirmation. Verify extension/main-store concurrency.
- [ ] English/Ukrainian VoiceOver, largest text, increased contrast and Reduce Motion.
- [ ] Physical cold/warm/scroll traces, memory and runtime logs free of serious errors.

## Current device evidence

The optimized `Production` build signed successfully using the existing team
profile and was installed in place by XcodeBuildMCP. Signed entitlements contain
`Z6KADG969Z.cc.subeye.app`, `group.cc.subeye.app` and the original iCloud KV
identifier. The bundle includes native MMKV/RevenueCat privacy manifests and no
React/Expo/Hermes/JS bundle. Production fixture markers are absent from the binary.

Device: **iPhone 17 (iPhone18,3), iOS 27.0 (24A437)**. CoreDevice identifier:
`8E9E582B-7667-5520-A2FA-F6FCD2E537DB`. Production build log:
`logs/build_device_2026-09-16T07-30-00-955Z_pid52893_cee017b5.log` records the
visual rewrite installed after the user rejected the initial generic layout.
XcodeBuildMCP launched that build standalone successfully (PID 6289).

Before installation, Documents (including all five MMKV stores/metadata), app
preferences and App Group preferences were backed up under ignored
`Artifacts/device-backup/`. A full-container copy hit protected SplashBoard
snapshot files; the targeted data backups completed successfully. Keep these
private artifacts local and preserve them until real-device acceptance.

The actual backup was migrated in an isolated simulator namespace: **12
subscriptions, 9 categories, 0 phases, plus preferences**. All 22 keyed records
matched the selected legacy slot after optional-null normalization; SQLite
`quick_check` passed. The active source was slot B. This is real-data migration
evidence, but it does not substitute for launching the installed phone build.

The user unlocked the phone on September 16, resolving the earlier launch
blocker. The corrected physical run passed all four tests: existing-record
browsing, temporary-record create/search/edit/delete, calendar/settings,
explicit cleanup, five process launches and five foreground activations. The
first edit failure was a test cursor-position error; the corrected harness
positions the caret before replacing the price and waits for save completion.
Result: `result-bundles/test_device_2026-09-16T07-40-18-580Z_pid60361_cd55768c.xcresult`.
An earlier temporary record survived a cleanup helper's silent early return;
cleanup now fails explicitly when navigation is unavailable and uses localized-
independent identifiers. Its removal and final visual checks both passed in
`result-bundles/test_device_2026-09-16T08-17-26-418Z_pid88438_950de8d9.xcresult`.
See [performance](PERFORMANCE.md) for measured launch times and their limits.
The user accepted the main visual rewrite and requested further picker, header,
logo and Live Activity refinements. Physical service acceptance remains open.

CoreDevice refuses to export the App Group's root-level `native` directory:
its copy service allows only `Library`, `Documents` and `tmp`. The full keyed
record comparison above therefore remains simulator evidence; do not describe
it as an exported physical SQLite comparison.

The earlier `No Accounts`/missing App Groups failure applies to the separate
development identity. Production reused an existing valid profile. Provisioning
`cc.subeye.app.native` still requires Xcode account access for a coexisting
development install; that does not block the installed Production build.
