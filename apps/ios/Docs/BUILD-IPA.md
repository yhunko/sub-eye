# Build an App Store IPA

From the repository root:

```sh
rtk proxy bun run build:ios
```

The command reserves the next build number, builds a fresh **Production**
archive, and exports a named App Store IPA such as
**`builds/ios/subeye-6.0.0-build4-20260916-1530.ipa`**. Add the printed file
to Transporter. No iPhone, Expo build, Organizer interaction or upload is part
of the normal build command. The marketing version is **6.0.0**.

## Automatic build numbers

The app and widget receive the same `CURRENT_PROJECT_VERSION`. The command
checks existing native archives when choosing the next number and saves the
reservation in the Git common directory at `subeye-ios/build-number`. For a
normal checkout, that is `.git/subeye-ios/build-number`.

- Deleting `builds/` or DerivedData does not reset the counter.
- Worktrees of this repository share the counter. Concurrent reservations are
  locked, so two builds cannot get the same number.
- Failed builds consume a number. Retry an existing archive with `--export-only`
  to keep its number, or rerun the normal command for a new build.
- This is a **local counter**, not EAS's remote version service. Separate clones,
  Macs and CI machines do not share it. When moving the build to another machine,
  check the latest App Store Connect build and provide a higher number once:

  ```sh
  rtk proxy bun run build:ios 50
  ```

  Substitute the actual next number. The following normal invocation uses `51`.
  An explicit number cannot reuse an existing local reservation. Exporting an
  archive from elsewhere also advances the local counter to at least its number.

## Output and clean builds

```text
builds/ios/
  subeye-6.0.0-build4-20260916-1530.ipa  # Version, build number, local export date/time
  SubEye.ipa                  # Convenience copy of the latest successful build
  SourcePackages/             # Shared cache of pinned native dependencies
  6.0.0-4-<timestamp>-<id>/
    SubEye.xcarchive/          # App, widget, metadata and matching dSYMs
    DerivedData/              # Fresh compilation output for this build
    build-info.txt            # Xcode, version/build, commit and worktree status
    archive.log
    export-<id>/
      SubEye.ipa              # Permanent copy for this export
      export.log
      ...                     # Xcode distribution reports/options
```

Every archive gets fresh DerivedData; no separate clean command or global
DerivedData deletion is needed. Native packages use the checked-in
`Package.resolved`. The command checks Production identity, public service-key
configuration, and matching app/widget versions. It checks the exported IPA's
identity and versions before atomically replacing the convenience copy.

Named IPAs sit directly in `builds/ios/`, following the Expo output convention
with the build number added. Every export is retained, including retries. If
the same build is exported twice in one minute, a `-2`, `-3`, etc. suffix avoids
overwriting the previous file.

Failed builds leave the previous successful `SubEye.ipa` intact. An older build
finishing after a newer one cannot replace it. Always use the success message
and printed version/build to identify the result of a particular invocation.
Versioned artifacts remain available. `builds/` is ignored by Git; retain release
archives separately for crash symbolication.

## One-time signing setup

1. Install Xcode with iOS platform support and select its Command Line Tools
   under Xcode → Settings → Locations. The selected Xcode/SDK must be accepted
   for submission; check [Apple's release notes](https://developer.apple.com/help/app-store-connect/release-notes/).
2. Sign in under Xcode → Settings → Apple Accounts with access to team
   `Z6KADG969Z`. Command-line export needs an **Apple Distribution** certificate
   with its private key in the Mac's Keychain and matching App Store profiles
   for `cc.subeye.app` and `cc.subeye.app.widget`.
3. If needed, create the certificate under the team's **Manage Certificates →
   + → Apple Distribution**. Download or generate matching profiles. An
   Organizer **Custom → App Store Connect → Export → Automatically manage
   signing** pass can generate them. Keep **Manage version and build number**
   off so the script's reserved number is preserved.
4. Create ignored `apps/ios/Config/Local.xcconfig` from the adjacent example,
   with the production RevenueCat public iOS SDK key and Brandfetch public
   client ID. Install repository dependencies with Bun. Python 3, included with
   the Xcode command-line tools, is used for locking and artifact checks.

A development certificate alone is insufficient. Apple's cloud-managed
certificate can sign through Organizer without a local private key, which does
not establish that command-line export works. See [Apple's cloud-managed
certificate guidance](https://developer.apple.com/help/account/certificates/cloud-managed-certificates).
This Mac now has a local distribution identity and matching profiles, expiring
16 September 2027. Renew signing assets when they expire or capabilities change.

Packaging uses Apple's `xcodebuild archive` and `-exportArchive` because
XcodeBuildMCP does not expose these packaging operations. The checked-in
`Config/ExportOptions-AppStore.plist` selects automatic App Store signing, local
export, symbol inclusion and preservation of the reserved build number.

## Retry signing without rebuilding

```sh
rtk proxy bun run build:ios --export-only "/absolute/path/to/SubEye.xcarchive"
```

Each retry gets a new export folder. Successful retries also update the
convenience IPA, unless a newer build is already there.

If Xcode reports missing accounts, certificates or profiles, fix that signing
setup first. A profile must include the installed distribution certificate;
creating a certificate alone does not update existing profiles. Xcode may show
an account in the GUI while the CLI cannot use it to fetch missing assets.
Organizer can refresh the profiles, after which the CLI can use them locally.

To create only an archive for interactive signing:

```sh
rtk proxy bun run build:ios --archive-only
```

Open the resulting archive in Organizer and use the export sequence above. See
[Apple's distribution guide](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases).

## Upload

1. Open Transporter and sign in to the existing App Store Connect team.
2. Add the named IPA printed by the command, choose **Verify**, then **Deliver**.
3. Wait for processing, then select the build for TestFlight or the 6.0.0 release.

Transporter accepts IPA files and generates the upload package; see
[Apple's Transporter instructions](https://support.apple.com/guide/transporter-app/apdac1c9a477/mac).
Packaging success is separate from the service-validation items in
[the release handoff](MIGRATION-RELEASE.md#physical-device-acceptance--still-required).

## Verification

The counter and publication regression tests cover simultaneous reservations,
failed builds, cleanup, explicit overrides, damaged state, imported archives,
invalid IPAs, exports finishing out of order, and re-export filename collisions:

```sh
rtk proxy python3 -B -m unittest discover -s apps/ios/scripts -p 'test_*.py' -v
```

On 16 September 2026, `bun run build:ios` with no arguments automatically chose
**6.0.0 (4)**, completed a fresh Production archive with Xcode 27.0 (27A266a),
and exported `builds/ios/SubEye.ipa`. The next automatic build will use `5`.

The IPA's app and widget both report 6.0.0 (4), pass strict code-signature
verification, and have App Store profiles containing the local distribution
certificate. Both profiles have `get-task-allow` false and no provisioned-device
list. The convenience IPA matches the versioned export byte for byte; the
archive retains both matching dSYM bundles. Export-only was also verified on
build 3. Nothing was uploaded or validated by App Store Connect.

The naming update also published the verified build 4 as
`builds/ios/subeye-6.0.0-build4-20260916-1515.ipa` without rebuilding or changing
its build number.

All eight build-tool regression tests, shell syntax, repository type-check,
tests and dependency-boundary checks passed.
