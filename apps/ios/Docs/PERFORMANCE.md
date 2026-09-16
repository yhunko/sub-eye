# Native performance and validation record

2026-09-16. Optimized physical-device launch and CRUD checks now pass. Service
acceptance and physical scrolling/trace measurements remain open. Simulator
measurements below are labelled separately and must not be treated as hardware
frame-rate results. See [release handoff](MIGRATION-RELEASE.md#physical-device-acceptance--still-required).

## Physical-device measurements

iPhone 17 (iPhone18,3), iOS 27.0 (24A437), optimized `Production`, Xcode 27.0.
Existing user data was populated (12 subscriptions, 9 categories, no pricing
phases in the pre-upgrade backup), with an earlier temporary CRUD record still
present during measurement. That record was subsequently removed and verified
absent in the final device check. Later user edits are preserved. Five process
launches used the populated local cache, with XCTest instrumentation and no
debugger attached. Network remained enabled; thermal state was not recorded.
These are process restarts, not rebooted or cache-flushed cold starts.

| Metric | Mean | Range |
| --- | --- | --- |
| Process launch to first frame | 0.368 s | 0.359–0.379 s |
| Process launch until responsive | 0.483 s | 0.463–0.515 s |
| Foreground activation including XCTest synchronization | 1.926 s | Not a pure app-render measurement |

The four-test physical run passed existing-data CRUD/search/calendar/settings,
temporary-record cleanup, five process launches and five foreground activations.
Result: `result-bundles/test_device_2026-09-16T07-40-18-580Z_pid60361_cd55768c.xcresult`.
The app also launched standalone through XcodeBuildMCP. Subsequent picker and
Live Activity refinements are not represented by these earlier launch metrics.

## Environment and dataset

- Xcode 27.0 (27A266a), Swift 6, complete concurrency checks, optimized Release.
- Simulator: iPhone 17 Pro, iOS 26.5 (23F77), arm64; macOS 27 (26A428) host.
- Dataset: 1,000 monthly subscriptions and 6,000 historical price phases,
  USD/UAH prices and long English/Ukrainian names, without categories or logos.
  This stresses record/history volume; other billing periods are covered by
  domain tests. Isolated development test-store UUID
  `2D8AB337-F4A9-482D-9011-A71D3C437C22`.
- Tests disable optional network/cloud/purchase work and do not grant Pro unless
  explicitly requested by a development-only fixture flag.
- Build products: `~/Library/Developer/Xcode/DerivedData/SubEyeNative`.
- Local artifacts (ignored): `apps/ios/Artifacts/{profile,memory,accessibility}`.
- Result bundles/logs: `~/Library/Developer/XcodeBuildMCP/workspaces/sub-eye-caaf571d7c40/`.

## Simulator baseline before the visual rewrite

Five iterations, populated local cache, optimized Release. Launch testing
terminates/relaunches the process; it does **not** reboot the device or flush OS
caches. These values predate the Expo-aligned visual rewrite.

| Metric | Result |
| --- | --- |
| Process launch to first frame | mean 1.229 s; 1.211–1.241 s; relative standard deviation 0.91% |
| Process launch until responsive | mean 1.383 s; 1.351–1.423 s; relative standard deviation 2.25% |
| Scroll signpost duration | mean 2.590 s (XCTest Scroll_DraggingAndDeceleration metric) |
| CPU per block of five fast up/down swipes | mean 4.344 CPU seconds, includes accessibility automation work |
| Absolute memory during scrolling | mean 60.423 MB; peak mean 60.997 MB |
| Memory delta across five scroll blocks | 81.9, 49.2, 65.5, 131.1, 16.4 KB |

The scrolling duration does not establish FPS or hitch rate. No acceptance
baseline was locked; passing this suite means measurement succeeded. Record
frame hitches and visible responsiveness on hardware before accepting performance.

Result: `result-bundles/test_sim_2026-09-15T21-52-33-488Z_pid93294_f0d99a1c.xcresult`.
Log: `logs/test_sim_2026-09-15T21-52-33-487Z_pid93294_b1ce85da.log`.
Run the `SubEyePerformance` scheme for a repeat. Later UI changes were not
included in these measurements.

## ETTrace

Temporary native ETTrace embedding was used for simulator sampling and then
removed from `project.yml` and the generated project. It is not a shipping
dependency. The separate instrumented build is `SubEyeNativeProfile`.

| Trace | Wall span | Main active | Main idle |
| --- | --- | --- | --- |
| `Artifacts/profile/launch/launch-1000-records.json` | 8.984 s | 0.505 s | 8.480 s |
| `Artifacts/profile/scroll/scroll-1000-records.json` | 14.076 s | 1.902 s | 12.174 s |

Launch sampling attributed approximately 103 ms of active main-thread leaf
time to Swift protocol-conformance work. Scroll sampling was dominated by
UIKit/CoreAnimation and XCTest accessibility snapshots; overlapping inclusive
stack percentages must not be added together. There was no unresolved app-symbol
warning in the scroll trace. A tiny launch app-symbol unresolved fraction and
ETTrace's own unresolved frames are retained in the raw report.

Trace intervals include idle time; their wall spans are not launch times.
Matched dSYMs are under `profile/dsyms` and `profile/scroll-dsyms`; runner logs,
original `output_259.json` and folded stacks remain alongside the captures.
ETTrace reports the host OS build, so the simulator OS above comes from xcresult.

## Memory and retain cycles

`MemoryTests/testDetailOpenCloseCycles` opens/closes detail ten times. Captures
were triggered by explicit before/after test markers in the **same process
(PID 5663)**, using the iOS memgraph skill. Both graphs report zero leaks.

| Capture | Footprint | Peak footprint | Allocated bytes reported by leaks |
| --- | --- | --- | --- |
| Before cycles, 01:06:21 Kyiv | 53.0 MB | 55.3 MB | 32,224 KB |
| After cycles, 01:07:26 Kyiv | 50.5 MB | 57.6 MB | 33,814 KB |

No leaked retain cycle was reported. The modest allocated-object increase can
include framework caches; this finite run does not prove unlimited-session
stability. Recheck on the physical device with its real record/logo dataset.

Graphs: `Artifacts/memory/controlled-before/cc.subeye.app.native-5663-20260916-010620.memgraph`
and `controlled-after/cc.subeye.app.native-5663-20260916-010725.memgraph`.
Result: `result-bundles/test_sim_2026-09-15T22-05-51-873Z_pid5408_6f7d5eb3.xcresult`.
A separate fresh launch without XCTest reported 0 leaks / 49.3 MB footprint.
The earlier `cycles-before` directory contains a **mid-cycle** capture and must
not be described as a before/after comparison.

## Functional validation

- Release core: **25 tests passed**, including 76 shared vectors.
  `logs/swift_package_test_2026-09-15T22-15-40-149Z_pid12176_eb0decb5.log`.
- iOS 26.5 simulator: **9 tests passed** (binary migration/cache/logo/widget
  privacy tests and four UI flows).
  `result-bundles/test_sim_2026-09-15T22-39-29-292Z_pid30534_20c7b143.xcresult`.
- iOS 18.0 simulator: **8 tests passed** before adding the widget-privacy test.
  `result-bundles/test_sim_2026-09-15T22-35-07-540Z_pid27084_f3f7e858.xcresult`.
- TypeScript golden verification: **76 vectors matched**. Root type-check and
  tests: 11/11 workspaces successful (Turbo cache); dependency check: no
  violations, 1,271 modules / 2,776 dependencies.

The iOS 18 calendar initially crashed inside UICollectionView self-sizing with
a nested lazy grid. Replacing its bounded month grid with an eager Grid fixed
the crash; both primary-flow suites above include the fix. Accessibility fixes
also include the fallback icon letter, long detail headings and native bar
occlusion handling. Later widget dark-color correction and the free Pro-pitch
subtitle received focused validation rather than another complete performance run.

Widget snapshots were visually inspected at small and medium sizes on an iOS
26.5 Home Screen using synthetic Pro data. The initial black-on-dark text inherited
the Home Screen's light color scheme; the widget now explicitly uses dark semantic
colors. Evidence: `Artifacts/widget/{small,medium}-pro-light-home.jpg`. Automated
free/Pro snapshot privacy validation also passes. Physical widget interaction and
accessibility-size rendering still need acceptance.

## Instrumentation and remaining measurements

Signposts: `ProcessLaunch`, `StoreOpen`, `Migration`, `FirstModelAvailable`,
`FirstInteractiveFrame`. The launch event is emitted in Swift App initialization,
so it excludes pre-main work; XCTest launch metrics cover the broader launch.
`FirstInteractiveFrame` is a CADisplayLink probe at the first presentation, not
a claim that cloud reconciliation has completed.

Before release, record physical device model, OS/build, app commit/configuration,
dataset size, thermal state, debugger attachment, network/cache conditions and
at least five cold process launches plus five warm foreground resumes. Capture
Instruments/ETTrace launch and scrolling traces, identify regressions, fix them,
then repeat the affected measurement. Keep production user data separate from
the 1,000-record development fixture.

The physical iPhone's optimized Production build is signed, installed and has
launched standalone. Physical launch values are above; physical scrolling,
memory traces, offline launch and external-service acceptance remain required.
