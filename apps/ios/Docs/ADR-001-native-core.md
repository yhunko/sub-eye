# ADR 001: Native Swift core and transactional App Group storage

Status: accepted for implementation, 2026-09-15.

Use Swift for the domain and an SQLite store through the platform C library.
Keep Foundation models independent of SwiftUI. Transactions protect concurrent
main app, widget and App Intent processes; actors keep each connection off the
main actor. Retain the existing record-level JSON wire format for iCloud and
archives, and check shared TypeScript/Swift golden vectors into the repository.

Do not add Kotlin Multiplatform. Android already owns tested TypeScript rules;
KMP would require moving both clients' domain code, add another toolchain and
runtime to the iOS binary, and still leave ActivityKit/App Intents/platform
storage adapters in Swift. Golden vectors address the present high-risk drift
without that cost. Revisit only with measured evidence of duplicated domain
maintenance outweighing binary and launch cost.

Use Tencent's native MMKV reader on COPIES of the old files for migration. This
dependency does not include React Native, Nitro, Expo or JavaScript. RevenueCat
is the other native SPM dependency. Never initialize either on the first-frame
critical path. SQLite needs no third-party driver.

Keep iOS 16.4 support: Observation owns state on iOS 17+, with a narrow
value-type `@State` presentation adapter for 16.4 over the same state/repository.
Use Tab APIs on iOS 18+ and native TabView items on earlier versions. System
navigation picks up Liquid Glass on recent SDKs without custom overlays.

Development and production have separate bundle identifiers, URL schemes,
iCloud namespaces, database paths and widget snapshot keys. They may share the
registered App Group capability but never the same native database.
