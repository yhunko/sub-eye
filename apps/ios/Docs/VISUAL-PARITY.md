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

## Screenshot review: menus, calendar and creation

The next seven-screen review identified interaction differences that static
screen comparisons had missed. The native implementation now follows the Expo
sources for these details:

- Detail actions use a trash symbol, a separated destructive action and Expo's
  shorter cancellation label. Deletion uses a system alert with explicit Delete
  and Cancel actions, replacing the oversized Form sheet.
  The trash image preserves its red tint through UIKit's menu rendering.
- Subscription filters use nested native menus for sort, grouping, status and
  category. Non-default selections appear in their parent labels, and each
  submenu retains the system checkmarks.
- Calendar months use a native page-style TabView. Each page owns its total,
  grid and vertically scrolling agenda; the arrows and Today control the same
  selected month. The year and options buttons use Expo's grid/slider symbols.
  Weekday labels follow the app locale, and adjacent days receive event logos.
- Tapping the brand identity opens brand selection directly. The redundant
  pencil/overflow menu is gone; logo style remains available with brand selection.
- Settings displays the current timezone directly. Only a timezone differing
  from the device offers Expo's compact "use device timezone" confirmation.
  The duplicate preferences sheet was removed.
- New-subscription steps are actual NavigationStack destinations, retaining
  draft state through native forward/back and interactive back transitions.
  Focus clears before a push, preventing the restored price keyboard from
  covering the Next action on return. A dirty editor's close button becomes
  a native discard menu anchored to that button, matching Expo; untouched
  forms close immediately. Discard has a red trash symbol as well.
  Starting offers use full-width labeled choice rows with explanatory text,
  matching Expo's layout and Pro access. Shared section cards fill their width.

The focused simulator tests capture both English and Ukrainian and exercise
menu expansion, cancelled deletion, month swipes, Today, backward navigation,
brand selection and retained offer selection. The physical test for this pass
opens the deletion alert and cancels it, edits an existing name and discards
that draft, verifies the original name, then discards a new-subscription draft.
It does not save or delete a subscription.

Validation on 16 September 2026:

- iOS 26.5: the focused CRUD and English/Ukrainian interaction run passed 3/3
  after correcting brand/back navigation. The earlier full run passed the
  other 15 checks; its two new interaction failures led to that correction.
- Final iOS 18 application code: 16/17 passed in the full run. The Ukrainian
  test tapped the toolbar during the detail push, before the menu could open.
  Explicit transition waits fixed the test; its complete focused rerun passed.
  Results: `test_sim_2026-09-16T10-03-04-537Z_pid58505_b94f7d37.xcresult` and
  `test_sim_2026-09-16T10-10-14-884Z_pid63506_0320c664.xcresult`.
- Physical iPhone 17, iOS 27, Ukrainian: the final interaction test passed
  (1/1, 66.7 seconds). Inspected captures confirm the red trash image, native
  deletion alert, collapsed/expanded filters, month swipes, offer rows, brand
  selector and discard menus anchored to both the edit and creation buttons.
  Result: `test_device_2026-09-16T10-04-40-203Z_pid59839_ea55b1fb.xcresult`.
  Twelve captures and their manifest are in `Artifacts/visual/seven-device-final`.
- The installed production build launched standalone through XcodeBuildMCP
  (PID 7006). Repository type-check, test, boundary and diff checks passed.

These results cover this UI iteration; the documented external-service release
gates remain separate.

## Control consistency and brand-style previews

- Today's calendar control has a compact visible capsule with a 44-point touch
  area. It is accented and selected only while showing the current month.
- Dismissible sheets share a visible system grabber and corner treatment.
  Unsaved subscription drafts retain their discard menu and hide the grabber
  while interactive dismissal is disabled. Sheet cancel/save/confirm controls
  use accessible cross/checkmark toolbar buttons. Creation's final Save action
  and pricing/lifecycle confirmations follow the same header pattern.
- Live Activities sits immediately after renewal reminder settings. Reminder
  counts, next-fire status and the test action stay at the bottom.
- Settings currency navigation uses the tab's route path. The surviving stack
  animates tab-bar visibility, including restoration during a pop. Inspected
  video frames show the bar fading in before the currency page finishes leaving
  (`Artifacts/visual/polish-transitions.mp4`, around 104.6–104.9 seconds).
- The brand row has a native Liquid Glass pencil button on the right, matching
  Expo's glyph-sized glass inside a 44-point layout slot. Only this button opens
  the pushed brand picker. Amount entry and currency selection have separate
  touch areas, a vertical divider, currency flag and disclosure glyph.
- Brand style uses image preview choices for icon, symbol and wordmark. Preview
  loading tries only that style's URLs, omits unavailable styles and deduplicates
  identical images. Previews populate the disk cache used by the actual logo.
  Changing style updates the draft logo and backdrop immediately; saving also
  refreshes already-visible logos. A style-only edit now counts as unsaved.
- Subscription-list rows open the overview with a normal tap. Their long-press
  context menu has been removed.

The physical check selects Netflix's wordmark, returns to the price step, then
switches to its icon and verifies selection again. Captures show both distinct
images and their matching backdrops. It also checks calendar highlighting,
sheet controls, currency navigation, amount/currency separation and notification
section order, then discards the unsaved subscription.

Validation on 16 September 2026:

- iOS 18: the final full suite passed 18/18, including logo-style persistence,
  cache reuse, CRUD, both languages and accessibility layouts. Result:
  `test_sim_2026-09-16T11-09-18-590Z_pid3725_948e6c2d.xcresult`.
- iOS 26.5: all ten UI checks passed. The full run passed 17/18; the new logo
  notification test used an object-identity filter for a bridged string. Its
  corrected value comparison passed in the final iOS 18 suite. Result:
  `test_sim_2026-09-16T11-01-51-426Z_pid96036_ea95354f.xcresult`.
- Repository type-check, test, boundary and diff checks passed.
- Physical iPhone 17, iOS 27, Ukrainian: the final control check passed 1/1.
  Captures confirm Live Activities directly below renewal reminders, diagnostics
  last, and both distinct brand styles. Result:
  `test_device_2026-09-16T11-11-37-392Z_pid5565_21442358.xcresult`.
  Twelve captures and their manifest are in `Artifacts/visual/polish-device-complete`.
- After removing the subscription-row context menu and setting version 6.0.0,
  the final Production build installed and launched standalone on the iPhone
  through XcodeBuildMCP (PID 7300). Both app and widget report 6.0.0 (1).
