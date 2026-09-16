# Native SubEye

Read the repository CLAUDE.md first. This directory is the native iOS client;
apps/mobile remains the Android client and the migration source of truth.

- Swift 6, complete concurrency checking. Pure rules and SQLite repositories
  live in SubEyeCore; SwiftUI and Apple service adapters live in SubEye.
- Preserve calendar days as UTC midnight and timestamps as instants. Never
  advance the stored payment anchor just because a payment date passed.
- Main actor owns presentation only. Store opening, decoding, projections,
  migration, and disk writes execute on the repository actor.
- Every shared-store mutation is an SQLite transaction, including extension
  acknowledgements. A process-local actor alone cannot protect app/extension IO.
- iCloud uses prefs, sub.<id>, cat.<id>, phase.<id>. Apply changed keys only;
  initial linking unions records. Never replace a store with a cloud snapshot.
- Migration reads copies of MMKV files. Originals stay intact until validated
  migration is committed. Never treat an unreadable legacy store as empty.
- Keep native project files checked in. project.yml is a convenience for
  reproducible project edits, not an Expo/CNG directory.
- All user-facing copy supports English and Ukrainian. Use native navigation,
  forms, search, menus, sheets and confirmation. Respect accessibility settings.
- Development builds use separate identity and store namespace. Production is
  cc.subeye.app, group.cc.subeye.app, widget kind SubEyeWidget, snapshot v1.
- Do not claim release readiness from a simulator build. The checklist and
  performance record must contain physical-device evidence.

Build, install, test and inspect with XcodeBuildMCP. Run core tests after domain
or storage changes and the repository type-check/test/boundary checks before
handoff. Money changes require regression tests.
