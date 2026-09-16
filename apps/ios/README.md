# SubEye for iOS

Native SwiftUI client alongside `apps/mobile`. The Expo client remains intact
for Android and as the migration source. This target has no React Native,
Expo, Hermes, JavaScript bundle or web UI.

The optimized **6.0.0 Production build is installed and launches standalone on
the physical iPhone**. Device and simulator UI results are recorded in
[visual parity](Docs/VISUAL-PARITY.md); external-service acceptance remains
tracked separately in the release handoff.
Measured results are recorded in [Performance](Docs/PERFORMANCE.md).
See [parity](Docs/FEATURE-PARITY.md) and the
[migration/release handoff](Docs/MIGRATION-RELEASE.md).

## Build

Requires Xcode 27 and Swift 6; the development commands below use XcodeBuildMCP.
The application supports iOS 16.4+;
the widget supports iOS 18+. Scheduled renewal Live Activities are gated to
iOS 27. `SubEye.xcodeproj` and source are checked in; XcodeGen is optional when
editing project configuration.

1. Copy `Config/Local.xcconfig.example` to ignored `Config/Local.xcconfig`.
   Supply the production RevenueCat **public iOS SDK key** (`appl_…`) and the
   public Brandfetch client ID. Do not add private service credentials.
2. In Xcode Accounts, sign in to team `Z6KADG969Z` and enable App Groups and
   iCloud key-value storage for both development and production identities.
3. Build the `SubEye` scheme. Run/profile use the separate development app;
   Archive uses the `Production` configuration.

From the repository root:

```sh
rtk proxy xcodebuildmcp simulator build-and-run --project-path "$PWD/apps/ios/SubEye.xcodeproj" --scheme SubEye --configuration Release --simulator-name "iPhone 17 Pro"
rtk proxy xcodebuildmcp simulator test --project-path "$PWD/apps/ios/SubEye.xcodeproj" --scheme SubEye --configuration Release --simulator-name "iPhone 17 Pro" --extra-args -parallel-testing-enabled NO
rtk proxy xcodebuildmcp swift-package test --package-path "$PWD/apps/ios/SubEyeCore" --configuration release
rtk proxy bun apps/ios/Contracts/golden.ts
```

If changing `project.yml`, regenerate and commit the resulting project:

```sh
rtk proxy xcodegen generate --spec apps/ios/project.yml
```

## Production IPA for Transporter

From the repository root, choose a new build number for the upload:

```sh
rtk proxy bun run build:ios 2
```

This archives `SubEye` / `Production` with fresh DerivedData and exports an
App Store Connect IPA into ignored `builds/ios/`. It preserves the archive,
dSYMs and logs and does not upload anything. App and widget versions are checked
before export. See [IPA build and signing](Docs/BUILD-IPA.md) for prerequisites,
output paths, export retry and Transporter steps.

## Structure

| Directory | Responsibility |
| --- | --- |
| SubEyeCore | Foundation models, recurrence/money/pricing/lifecycle, projections, reminder planning, transactional SQLite repository and migration |
| SubEye/App | SwiftUI scene ownership, first-frame probe, injected services, routing and test-only fixtures |
| SubEye/UI | Native tabs, navigation, lists, forms, search, sheets and confirmation |
| SubEye/Services | MMKV migration reader, cloud, notifications, purchases, logos, rates, widget publication and ActivityKit |
| Shared | Configuration, localization, widget snapshot contract and App Intents |
| SubEyeWidget | Small/medium widget and renewal Live Activity |
| Contracts | Shared TypeScript golden vectors and resource generation |

State uses Observation on iOS 17+ and a value-type `@State` adapter on 16.4.
SQLite runs on a repository actor; transactions protect writes across the main
app and extensions. The first frame uses a bounded local presentation cache
(384 KiB, at most 40 rows, no full phase history). Full local projection follows
off the main actor, then optional external services. A first migration can take
longer because the new presentation cache does not yet exist.

## Verification suites

- `SubEyeCoreTests`: domain, golden vectors, interrupted/older/corrupt migration,
  repository conflicts, cloud merge/outbox, deletion, reminder boundaries and
  review-prompt policy.
- `SubEyeTests`: real native binary MMKV migration, source byte preservation,
  bounded launch cache, development namespace and raster logo validation.
- `SubEyeUITests`: English create/edit/search/delete/calendar/settings, offline
  relaunch, Ukrainian flow and largest Dynamic Type accessibility audit.
- `SubEyePerformance` scheme: populated-cache process launch, large-list scroll
  metrics and repeated detail-page memory inspection. Test arguments and fixture
  entitlement overrides compile only in development configurations.
- `SubEyeDevice` scheme: Production UI acceptance using existing records, one
  uniquely named temporary CRUD record, and physical process-launch/warm-resume
  metrics. Back up the installed app before running this suite. A failed CRUD
  test can leave its clearly named temporary record for cleanup.

The accessibility audit excludes contrast samples underneath the native glass
navigation/tab bars, where iOS deliberately blurs scrolling content. It does not exclude
visible content or clipping/hit-region checks; offscreen contrast samples are
excluded as well. Manual VoiceOver and system
accessibility-setting verification remain part of physical-device acceptance.
