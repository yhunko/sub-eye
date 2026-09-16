# Expo visual parity

The September 16 correction makes the existing Expo UI the visual reference.
The first native List/Form redesign was rejected. Match Expo's content geometry,
color, typography and screen composition while retaining system navigation,
tabs, search, menus, sheets and accessible controls.

## Shared measurements

`SubEye/UI/Design.swift` mirrors `apps/mobile/src/shared/ui/theme.ts`:
background `#0f1115`, surface `#171a20`, alternate surface `#1f232b`, text
`#f2f4f8`, muted `#98a0ae`, accent `#33a453`, and bright accent `#6fd98c`.
Status fills, borders and the seven category colors follow the same source.
Fonts scale with Dynamic Type; accessibility sizes stack prices and controls.

| Surface | Native implementation aligned with Expo |
| --- | --- |
| Subscriptions | 12-point screen inset, 64-point rows, 18-point corners, 38-point circular logos, 15-point names, 12.5-point subtitles, 15.5-point prices; paired totals and descending group totals |
| Home | Month heading, horizontal payment rail, remaining/forecast/largest-payment card, segmented spending bar and expandable breakdown |
| Details | 108-point identity logo, brand-color backdrop, 26-point name, billing/amount/status pill, next-payment and spending-share cards, Pro history, overflow actions |
| Calendar | 66-point day tiles, 3-point gaps, month total, borderless agenda headings, past-charge summary, Pro heavy-day highlighting and compact three-column year heatmap |
| Creation/editing | Brand → price/cadence → date/offer steps, step indicator, 56-point fields, grouped cards and full-width bottom action |
| Settings/reminders | 16-point page inset, 24-point card corners, section captions, symbol/label/value rows, compact explanatory footnotes |
| Paywall | Five illustrated feature pages, native pagination, purchase/restore/legal footer; vertically stacked features at accessibility sizes |

Native system bars can differ across OS versions. Their layout and behavior
remain system-owned. This is close visual parity, not a claim of identical
rendered pixels on different operating systems.

## Evidence

The live Expo development client was run with a copy of the phone's legacy
MMKV data and compared with the isolated native migration of that same data.
The older reference screenshot predates the OpenAI subscription: its totals
must not be used to alter the current calculations. Daily FX refresh can also
change displayed converted amounts.

`SubEyeUITests/testScreenCompositionAndAddSteps` captures Home, subscriptions,
details, editing, calendar, settings, reminders, brand selection and manual
entry. Captures and device backups stay in ignored `Artifacts/visual` and
`Artifacts/device-backup`; they are not repository fixtures.

The user accepted the main installed visual rewrite on September 16 ("looks
great"), then requested the following refinements:

- Currency selection pushes a searchable grouped list, with suggested
  currencies, flags, names, symbols and a selected checkmark. Settings opens
  this screen directly.
- Category selection pushes a searchable list; creation uses a tall rounded
  bottom sheet with Expo's emoji groups and automatic name-based emoji.
- Billing recurrence matches Expo's seven common presets, checked native menu
  and separate custom count/unit wheels. Existing counts over 60 are preserved.
- The detail backdrop extends through the hero, navigation and status area.
  It blurs before enlargement, with a stronger 40-point blur so logo lettering
  becomes a soft brand-color wash. Cached avatar imagery supplies the first frame.
- A calendar or Home rail day with one subscription opens its detail directly;
  multiple subscriptions use a day list.
- Subscription names retain their logos in lists, payment events, breakdowns,
  pricing/lifecycle sheets, widgets and Live Activities. Cached logo bytes load
  before network refresh, and Live Activities use cached App Group image files.
- A single renewal uses one spacious logo/name/amount row without a total
  header. Multiple renewals retain the summary. The Lock Screen uses an explicit
  iOS 26+ glass surface over a clear ActivityKit background, with a system
  material fallback. Glass is a separate background layer so WidgetKit retains
  the foreground content. Physical single-renewal appearance was inspected on
  the iPhone 17 running iOS 27; both 44-point actions remain fully visible.

The main rewrite passed 10/10 on iOS 26.5 and 10/10 on iOS 18. The follow-up
iOS 26.5 suite passed 13/14; the sole failure was detail-pill contrast at the
largest Ukrainian text size. A darker pill fixed it, and its focused rerun
passed. Currency/category creation, custom recurrence and direct single-day
navigation all passed. A subsequent iOS 18 full run passed 14/14. The multi-day
navigation regression and existing-activity payload migration passed focused
iOS 26.5 tests. Widget privacy tests now use an isolated preferences suite and
logo folder to avoid competing with the test host's own widget publisher; both
widget tests passed again after that isolation.

Current captures are in `Artifacts/visual/followup`. Physical full-height hero
and clear Live Activity proof are in `Artifacts/visual/device-glass-content`:
`test_device_2026-09-16T08-14-14-176Z_pid85359_646622e7.xcresult`. The stronger
post-feedback blur was inspected in the simulator and on the phone in
`Artifacts/visual/device-final`; the final physical two-test run also verified
removal of an earlier temporary record. The installed build launched standalone
through XcodeBuildMCP (PID 6627). None of these UI checks certify external service
release readiness.
