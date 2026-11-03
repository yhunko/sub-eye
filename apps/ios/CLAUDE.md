# Native SubEye

The only SubEye client. It replaced the retired Expo app and migrates that app's
MMKV store on first launch; `SubEyeCore` is the source of truth for every domain
rule.

- Swift 6, complete concurrency checking. Pure rules and the SQLite repository
  live in `SubEyeCore`; SwiftUI and Apple service adapters live in `SubEye`.
- Calendar days are UTC midnight, timestamps are instants. Never advance the
  stored payment anchor just because a payment date passed.
- The main actor owns presentation only. Store opening, decoding, projections,
  migration and disk writes run on the repository actor.
- Every shared-store mutation is an SQLite transaction, including widget and
  Live Activity intent acknowledgements: a process-local actor cannot protect
  IO shared with an extension.
- iCloud uses `prefs`, `sub.<id>`, `cat.<id>`, `phase.<id>`, `installment.<id>`.
  Apply changed keys only; initial linking unions records. Never replace a store
  with a cloud snapshot.
- Migration reads copies of the MMKV files and leaves the originals intact until
  a validated migration commits. Never treat an unreadable legacy store as empty.
- `Debug` and `Release` build the separate development identity
  (`cc.subeye.app.native`, own store namespace, `NATIVE_DEVELOPMENT` defined —
  the developer screen and test fixtures compile only there). `Production` is
  `cc.subeye.app`, `group.cc.subeye.app`, widget kind `SubEyeWidget`.
- User-facing copy exists in English and Ukrainian.
  `Shared/Resources/*.lproj/Localizable.strings` are hand-maintained and must
  keep identical keys; `L()` fills `{name}` placeholders, not printf specifiers.
- `SubEye.xcodeproj` is checked in and generated from `project.yml`. Adding or
  removing a file needs `xcodegen generate --spec apps/ios/project.yml`; a
  package pin lives in `project.yml`, the `.pbxproj` and `Package.resolved`.
- Do not claim release readiness from a simulator build; the release checklist
  needs physical-device evidence.

## Checks

```bash
swift test --package-path apps/ios/SubEyeCore   # domain, golden vectors, repository, reminders
```

`Fixtures/golden-v1.json` holds vectors frozen from the retired TypeScript
packages. A deliberate rule change updates the fixture in the same commit, with
a test that shows why.

Build and test the app with XcodeBuildMCP (`SubEye` scheme; the README lists the
commands). Run the core tests after any domain or storage change, then the
repository checks from the root `CLAUDE.md`.
