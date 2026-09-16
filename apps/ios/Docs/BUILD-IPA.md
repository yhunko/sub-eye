# Build an App Store IPA

Use a **Production archive followed by an App Store Connect export**. The
exported IPA is the file to give Transporter. A normal device `.app` build has
development signing and is not an App Store upload package.

## One-time setup

1. Install Xcode 27 with iOS platform support. Select it in Xcode → Settings →
   Locations → Command Line Tools. Apple must accept the selected Xcode/SDK for
   App Store submissions; check [Apple's release notes](https://developer.apple.com/help/app-store-connect/release-notes/).
2. Sign in under Xcode → Settings → Accounts with access to team `Z6KADG969Z`.
   Automatic signing needs distribution-signing permission for both
   `cc.subeye.app` and `cc.subeye.app.widget`, including their existing App Group
   and the application's iCloud key-value capability. An installed development
   certificate alone does not establish that export will work.
3. Create ignored `apps/ios/Config/Local.xcconfig` from the adjacent example.
   Supply the production RevenueCat **public iOS SDK key** and Brandfetch public
   client ID. The packaging command checks the archived values before export.
4. Install repository dependencies with Bun as usual. Xcode resolves native
   dependencies using the checked-in `Package.resolved`. Expo/EAS is not part of
   this native build path.

## Build

For the current Mac's cloud-managed signing setup, the verified path is:

```sh
rtk proxy bun run build:ios 3 --archive-only
```

Open the printed `.xcarchive` in Xcode Organizer, then choose **Distribute App →
Custom → App Store Connect → Export → Automatically manage signing**. Keep symbol
inclusion enabled, turn off **Manage version and build number** to preserve the
explicit number, and export into that build's output folder. This route produced
the signed 6.0.0 (2) IPA; `3` is the next build number.

When command-line distribution signing is available, archive and export together
from the repository root:

```sh
rtk proxy bun run build:ios 3
```

Choose a number higher than the latest build you uploaded for version 6.0.0,
then use `4`, `5`, etc. for subsequent uploads. The
command does not query App Store Connect or reserve a build number. It overrides
`CURRENT_PROJECT_VERSION` for both app and widget without editing the project.
The marketing version comes from the native project and is currently **6.0.0**.
A connected iPhone is not needed to archive or export.

Each invocation creates a fresh directory:

```text
builds/ios/6.0.0-2-<timestamp>-<id>/
  SubEye.xcarchive/            # Keep: app, widget, metadata and matching dSYMs
  DerivedData/                # Fresh compilation output for this archive
  build-info.txt              # Xcode, version/build, commit and worktree status
  archive.log
  export-<id>/
    SubEye.ipa                # Add this file to Transporter
    export.log
    ...                       # Xcode's distribution reports/options
```

The command prints exact paths when it finishes. `builds/` is ignored by Git;
preserve release archives separately for later crash symbolication. A shared
`builds/ios/SourcePackages/` cache avoids downloading the same pinned packages on
every archive. Compilation output is isolated per run, so a separate clean or
deleting Xcode's global DerivedData is unnecessary.

Packaging uses Apple's `xcodebuild archive` and `-exportArchive` because
XcodeBuildMCP does not currently expose archive/export commands. The checked-in
`Config/ExportOptions-AppStore.plist` selects automatic App Store Connect signing,
local export, symbol inclusion and the explicit build number. It never uploads.

## If signing fails

Open Xcode → Settings → Accounts and fix the reported account, certificate or
profile issue for the team. The archive is retained, so retry just the export:

```sh
rtk proxy bun run build:ios --export-only "/absolute/path/to/SubEye.xcarchive"
```

Each export attempt gets a new output folder. You can also open the archive in
Xcode Organizer, choose **Distribute App → Custom → App Store Connect → Export**,
and finish signing interactively. See [Apple's archive and distribution guide](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases).

## Upload

1. Open Transporter and sign in to the existing App Store Connect team.
2. Add the exported `SubEye.ipa`, choose **Verify**, then **Deliver**.
3. Wait for Apple to process the build. Select it under the existing SubEye app
   in App Store Connect for TestFlight or the 6.0.0 release.

Transporter accepts iOS IPA files and generates the upload package; see
[Apple's Transporter instructions](https://support.apple.com/guide/transporter-app/apdac1c9a477/mac).
Packaging success is separate from the outstanding service-validation items in
[the release handoff](MIGRATION-RELEASE.md#physical-device-acceptance--still-required).

## Local verification

On 16 September 2026, Xcode 27.0 (27A266a) completed a fresh Production archive.
Both the app and widget report **6.0.0 (2)**, and both matching dSYM bundles are
present. The App Store export reached signing, then reported `No Accounts` and
missing App Store provisioning profiles for both bundle IDs. The account was
visible in Xcode, and Organizer successfully exported using **Cloud Managed
Apple Distribution** for both targets. A subsequent CLI retry still reported
`No Accounts` and no local distribution identity; use the Organizer route above
for this Mac until command-line signing is configured.

Verified artifact:
`builds/ios/6.0.0-2-20260916T113903Z-nt34sV/export-organizer/SubEye.ipa`.
Its app and widget both report 6.0.0 (2); code-signature verification passed.
Both embedded profiles are App Store profiles, with `get-task-allow` false and
no provisioned-device list. The archive retains both matching dSYM bundles.
The IPA has not been uploaded or validated by App Store Connect.
The `3 --archive-only` command also completed successfully, preserving a separate
6.0.0 (3) archive without attempting export.

Shell syntax, export-options plist validation, repository type-check, tests and
dependency-boundary checks passed.
