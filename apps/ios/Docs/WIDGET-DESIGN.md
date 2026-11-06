# Home Screen widget review — September 16, 2026

The native widget had lost the Expo version's hierarchy: a redundant app-name
heading, three lines per renewal, an unbounded comparison sentence, and an
always-dark background. The small widget also tried to show both the month
summary and a renewal in one square. Its “also due” count included every
unshown subscription, even when those payments fell on different days.

The redesign follows `apps/mobile/targets/widget/index.swift`: one upcoming
payment in the small size; monthly total, a compact directional comparison,
and three two-line renewals in medium. Larger Dynamic Type uses fewer rows and
removes secondary decoration. Full labels remain available to VoiceOver.
Empty and free states retain the monthly total. Small widgets open their
subscription, medium renewal links open each subscription, and the free state
opens Pro. Amounts remain formatted by the app, with their original precision.

The full-color background adapts to light/dark appearance. It is registered as
a removable WidgetKit container background. iOS supplies the actual Liquid
Glass for the Home Screen's Clear appearance; the extension does not draw a
second glass layer over it. Comparison accents use semantic grouping, and
brand images use desaturated rendering in clear/tinted mode to retain detail.
See [Apple's WidgetKit guidance](https://developer.apple.com/documentation/widgetkit/optimizing-your-widget-for-accented-rendering-mode-and-liquid-glass).

## Verification

- Xcode 27, iPhone 17 Pro simulator, iOS 26.5: app and widget build and install.
- Inspected small and medium Home Screen widgets in full-color light and
  system clear appearances, including a Ukrainian fixture reproducing the
  reference's ₴6,233.63 total and ₴3,299.10 comparison.
- Inspected both sizes with `.accessibility5` injected into the widget view.
  That temporary override was removed after capture.
- Widget tests cover free/Pro payloads, same-day counts, timeline-relative
  localized dates, and existing Live Activity payload/path validation.
- Repository type-check, tests and dependency-boundary checks pass.

Captures are in ignored `Artifacts/visual/widgets-2026-09-16/`. They use an
isolated development fixture, with fallback initials rather than downloaded
brand logos. `#Preview` timelines cover English/Ukrainian, free, empty and
missing-data states. Physical-device appearance, VoiceOver and the full
accessibility-settings matrix still need device acceptance; this is simulator
evidence, not release certification.
