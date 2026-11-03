# Installments and Loans Implementation Plan

Steps use checkbox (`- [ ]`) syntax for tracking. One conventional commit per task; every commit builds.

**Goal:** Let a user track installment plans and loans — bank "pay in parts" (monobank Покупка частинами, PrivatBank Оплата частинами), Klarna / Affirm / PayPal Pay in 4, card installments, bank loans — next to their subscriptions, with progress, reminders and a correct place in Home totals and the calendar.

**Architecture:** An installment plan is its own record, `InstallmentPlan`, stored as `installment.<id>` rows in the existing `records` table and synced under the same prefix. It is never a `Subscription`. Its payment schedule is derived, never stored: a regular payment with the remainder on the last, dated by `Recurrence.occurrence` from the first payment date, each paid once its calendar day has passed. Plans reach the rest of the app as `CalendarEvent`s of kind `.payment` carrying an optional `installment` mark, merged into Home month totals and the calendar, and kept out of the monthly/yearly subscription cost, the savings ledger, lifecycle actions and Live Activities.

**Tech stack:** Swift 6, SubEyeCore (XCTest), SwiftUI, XcodeBuildMCP, `bun:test` for the legal package and the landing site.

## Decisions (made with Yehor, 2026-11-03)

- **Free:** unlimited plans; progress (x of N, paid, left to pay, end date); purpose icon and lender logo; counted in Home month totals and the calendar; day-before reminder; last-payment and paid-off notices; "Paid off early".
- **Pro:** overpayment from the purchase price; custom installment reminder lead days (same day, 1, 3, 7); installments in the Home Screen widget's upcoming list.
- **Navigation:** a Subscriptions | Installments switch at the top of the Subscriptions tab and a Home card, both shown only when at least one plan exists. No fifth tab.
- **Price:** Pro goes from $11.99 to $14.99 with Apple's default conversion in every storefront, Ukraine included, on the day the release ships. Existing owners keep Pro and get the new features — it is the same non-consumable and the same `pro` entitlement.
- **Follow-ups, not v1:** the cross-plan overview (total left, paid-off date, monthly load over time) and Extend term.

## Decisions this plan makes (check before approving)

1. **`installment.<id>` rows in `records`, not a new SQL table.** The store is one key/value table with `outbox`, `revision`, erase, export and iCloud all keyed off it (`SQLite.swift:25-34`); there is no schema-upgrade path. One name, `installment`, is used everywhere — record prefix, `Route.installment`, `installment_*` string keys, `installment-<id>` identifiers — because "plan" already means cancellation planning in the UI (`action=plan-cancellation`, `DueView.planning`, `form_plan*`).
2. **Store the regular payment, not just the total.** `total`, `payment` and `paymentCount` are all stored; the last payment is `total − payment × (count − 1)`. That reproduces the lender's statement exactly (3407.00 over 3 → 1135.67, 1135.67, 1135.66) instead of baking a rounding rule into data. The editor derives the missing one.
3. **Archives with plans are version 2.** `StoreDocument.v` defaults to 2 and decode accepts 0…2. An export with no plans is still written as v1, so a 6.2.0 device keeps importing it; an export with plans is v2, so 6.2.0 refuses it (with its generic "Please try again") instead of importing it and silently dropping every plan.
4. **A loose gate for sync, a narrow one for the editor.** The record validator — the gate for import and iCloud — checks only what the schedule math needs, so a later build that adds a kind, an interval or a longer term is not rejected here and then overwritten by this build's stale copy on the next link. The editor alone limits choices to monthly / every two weeks and 1…360 payments. `kind`, `symbol` and `tint` are stored as strings and fall back in the UI.
5. **Own reminder switch, inheriting existing consent.** `ReminderSettings.installments` and `installmentLeadDays` (default `[1]`). A stored settings blob without the new key takes `installments` from `renewals`, so someone who already turned on renewal reminders gets installment reminders too; a fresh install starts off, like renewals. Free keeps the switch with leads forced to `[1]`; Pro picks from 0/1/3/7.
6. **Edits rewrite the whole schedule.** Correcting a typo in the payment, count or first date should change past payments too — they were wrong. A real restructuring (Extend term) is the follow-up and will need a restructure point.
7. **"Paid off early" records a date and an amount** (default: what was left). The amount appears as one payment on that day, so the month total stays true; payments on or after that day disappear.
8. **"Paid at purchase"** (`paidAtPurchase`, the monobank/PrivatBank default) marks payment 1 paid from the start, so Home does not count a charge made at checkout as still due today and no same-day reminder fires for it. It only ever applies to a first payment dated on the day the plan was created.
9. **No categories on plans in v1.** The purpose icon answers "what for". `categoryId` can be added later as an optional field.
10. **Live Activities stay renewal-only.** Their Keep/Cancel actions and "Renews today" copy make no sense for a loan.
11. **Saving a new plan does not push its detail**, matching the subscription editor: the editor dismisses, or shows the one-time reminders offer first.

## Global constraints

- **SubEyeCore stays pure.** `now`, `today`, `rates` and `currency` are parameters. No clock, no UI types.
- **Every new field on a synced or cached `Codable` is `Optional`**, so old payloads still decode and re-encoding an old record adds no key (`SavingsTests.swift:157-160`, `LaunchCache.swift:19`, `WidgetSnapshot.swift:19-23`). Stored string vocabularies — `kind` values, `tint` tokens — are permanent once synced.
- **Money math in `Decimal`.** Installment amounts go through `Money.parse(_:below:)` with a 1e12 ceiling (exact to the cent in `Double`), not the 1e8 entry ceiling of a single subscription charge: a 1,200,000,000 VND car loan is ordinary. Written with `Money.canonical`. Never split in `Double`.
- **Calendar days are UTC midnight.** Date pickers use `.environment(\.timeZone, .gmt)` and save `Day.iso(Day.floor(date))`; `Installments` also floors `firstPaymentDate` and `paidOffAt` on read. "Today" in core is `Day.today(now, zone: preferredTimezone)`.
- **A payment is paid when its date is before today.** A payment due today is still due, matching `Dashboard.remaining` (`date >= today`).
- **Two currencies, one rule.** The plan's own screens (list rows, detail, editor) show the lender's numbers in the plan currency. Everything that mixes plans with subscriptions — Home, the calendar, reminders, the widget — uses amounts converted to the preferred currency with `rates.convert`, as subscriptions do.
- **One reminder planner, one budget.** Installment reminders are collected inside `ReminderPlanner.plan` and share `ReminderPlanner.budget` (56, not 64). They are always one-shot.
- **Money changes need a test that fails without them** (root `CLAUDE.md`). `golden-v1.json` is not touched; installments are a new rule.
- **Copy in English and Ukrainian with identical keys**; `{name}` placeholders; Ukrainian counts in the "Label: {count}" / "{paid} з {count}" style (there is no `.stringsdict`). No russian anything — including the popular-lender list. Key parity is checked with:

```bash
diff <(sed -n 's/^"\([^"]*\)".*/\1/p' apps/ios/Shared/Resources/en.lproj/Localizable.strings | sort) <(sed -n 's/^"\([^"]*\)".*/\1/p' apps/ios/Shared/Resources/uk.lproj/Localizable.strings | sort)
```

- **New app, widget and test files need `rtk proxy xcodegen generate --spec apps/ios/project.yml`** and the regenerated `.pbxproj` committed. New `SubEyeCore/Sources` files need nothing.
- **Comments only for quirks, traps and invisible rationale.**

---

## Task 1: the plan record and its schedule (core)

**Files:** `SubEyeCore/Sources/SubEyeCore/Models.swift`, `SubEyeCore/Sources/SubEyeCore/Money.swift`, new `SubEyeCore/Sources/SubEyeCore/Installments.swift`, `SubEyeCore/Sources/SubEyeCore/Migration.swift` (validator only), new `SubEyeCore/Tests/SubEyeCoreTests/InstallmentTests.swift`.

- [ ] Add the record to `Models.swift`, following `Subscription`/`PricePhase` (string amounts, `currency.lowercased()` in `init`, `createdAt`/`updatedAt = Day.iso(now)`):

```swift
public enum InstallmentKind: String, CaseIterable, Sendable {
    case payInParts, cardInstallment, loan
}

public struct InstallmentPlan: Codable, Identifiable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var kind: String
    public var symbol: String
    public var tint: String
    public var lenderName: String?
    public var lenderDomain: String?
    public var currency: String
    public var total: String
    public var payment: String
    public var paymentCount: Int
    public var every: Int
    public var period: BillingPeriod
    public var firstPaymentDate: String
    public var paidAtPurchase: Bool?
    public var price: String?
    public var paidOffAt: String?
    public var payoffAmount: String?
    public var notes: String?
    public var createdAt: String
    public var updatedAt: String
}
```

  `kind` is a string, so a kind added by a later build survives a round trip here; Task 5 adds the computed `InstallmentKind?` with its first caller. `every`/`period` reuse `BillingPeriod`.

- [ ] `Money.parse(_:below:)`: add the ceiling parameter, defaulting to today's `100_000_000`, so every existing call is unchanged.
- [ ] Add `Installments` in `Installments.swift`:
  - `payments(_ plan:, today:) -> [InstallmentPayment]` with `InstallmentPayment { number, date, amount: Decimal, paid }`. Dates come from `Recurrence.occurrence(anchor: firstPaymentDate, every:, period:, index:)`, which already counts from the anchor and keeps a 31st anchor on the 31st after February. Amount is `payment` except the last, `total − payment × (count − 1)`. `paid = date < today || atPurchase`, where `atPurchase` is `number == 1 && paidAtPurchase == true && date <= Day.shift(Day.floor(createdAt), days: 1)` — the extra day covers creation late at night east of UTC. When `paidOffAt` is set, payments dated on or after it are dropped, except a payment 1 already paid at purchase.
  - `payoff(_ plan:) -> (date: Date, amount: Decimal)?` — from `paidOffAt` and `payoffAmount`.
  - `remaining(_ plan:, on day:) -> Decimal` — the unpaid schedule from `day` on, ignoring `paidOffAt` and excluding a payment 1 paid at purchase. It is the default payoff amount.
  - `totals(_ plan:, today:) -> (paid: Decimal, left: Decimal, spent: Decimal)` — `spent` is what the plan costs in the end: kept payments plus `payoffAmount` when paid off, otherwise `total`. The payoff counts as paid once its day has come and as left before that.
  - `regularPayment(total:count:) -> Decimal?` — `total / count` rounded **up** to the cent (`NSDecimalRound(..., .up)`), so the last payment is never the largest; nil when that would leave the last payment at or below zero.
  - `editorAccepts(every:period:count:) -> Bool` — monthly or every two weeks, 1…360.
- [ ] `LegacyMigration.validate(_ row: InstallmentPlan)` — the sync and import gate, so it checks only what the math needs: non-empty id and trimmed name, symbol, tint and kind; 3-letter currency; `Money.parse(_, below: 1e12)` on `total`, `payment`, `price`, `payoffAmount`; `total > 0`, `payment > 0`; `paymentCount` 1…1000 (keeps `payments` bounded); `every` 1…365 with any `BillingPeriod`, as for subscriptions; `payment × (count − 1) < total`; `Day.parse` on every date; `paidOffAt` and `payoffAmount` both or neither; `price > 0` when present.
- [ ] Tests in `InstallmentTests.swift` (XCTest, the `DomainTests.swift` shape with a fixed `now`). Each must fail without the rule it pins:
  - 3407.00 over 3 from 2026-07-04 → 1135.67 / 1135.67 / 1135.66 on 07-04, 08-04, 09-04, summing to exactly 3407.00.
  - `regularPayment(total: 100, count: 3)` is 33.34 and the derived last is 33.32; `count: 1` gives the total; `regularPayment(total: 101, count: 120)` is nil.
  - A 31st anchor: 2026-01-31 → 02-28 → 03-31; 2024-01-31 → 02-29 → 03-31; a 24-payment plan on the 29th, 30th and 31st through leap and non-leap Februaries.
  - Every two weeks across a month end and a year end.
  - Paid boundary: due yesterday is paid, due today and tomorrow are not.
  - `paidAtPurchase` makes payment 1 paid on its creation day and no other payment; a stale flag on a first payment moved to next month does nothing.
  - `paidOffAt` before the first payment, on a due date and between due dates: later payments are dropped and `payoff` returns the stored amount. A mid-day `paidOffAt` instant on a due date drops that payment exactly once.
  - A same-day payoff on a `paidAtPurchase` plan keeps payment 1 and `remaining` defaults to total minus payment 1.
  - `totals.spent` after a payoff below what was left (12 × 1000, five paid, paid off with 6000) is 11000.
  - A plan entered mid-term (5 of 12 dates already passed) reports 5 paid.
  - The validator accepts a 1,200,000,000.00 total, `every: 1, period: .week` with 480 payments and an unknown kind; it rejects a last payment ≤ 0, a count of 0 or 1001, an empty name, a 3-decimal amount, and `paidOffAt` without `payoffAmount` (and the reverse).

**Commit:** `feat(core): model installment plans and their payment schedule`

## Task 2: store and sync plans (core)

**Files:** `Models.swift`, `Migration.swift`, `Repository.swift`, `Tests/SubEyeCoreTests/RepositoryTests.swift`, `Tests/SubEyeCoreTests/SavingsTests.swift` (compat pattern).

- [ ] `StoreDocument`: add `installments: [InstallmentPlan]` with an `init` default of `[]` (existing call sites in `NativeTesting`, `DeveloperScenario` and tests keep compiling). Change the `v` default to 2.
- [ ] `LegacyMigration.decode`: accept `version` 0…2 and set `root["v"] = 2`; add `"installments"` to the missing-array loop (`Migration.swift:55`, lowercasing currencies like the rest) so every legacy MMKV slot and every ≤6.2.0 export decodes with `installments == []`. Without it, unmigrated users hit "Neither legacy slot could be validated" at launch. `validate(_ doc:)` requires `v == 2`, checks `unique(doc.installments.map(\.id))` and validates each plan.
- [ ] `CloudRecords`: `owns` adds `key.hasPrefix("installment.")`; `entries` writes `"installment." + id`; `valid` decodes the plan, requires `row.id == String(key.dropFirst(12))` and runs the validator. `owns` gates link, push, receive, erase and the quota check, so leaving it out means plans never sync and remote ones survive Erase.
- [ ] `Repository.readDocument`: decode the `installment.` prefix into `doc.installments`. Unknown prefixes are skipped silently today, so without this plans would be stored and synced but invisible.
- [ ] `Repository.exportArchive`: write the exported copy as `v = 1` when `installments` is empty (6.2.0's decoder ignores the empty key).
- [ ] `Repository.saveInstallment(_ value:, expected:, now:)`: validate, transaction, read the current `installment.<id>`, throw `DomainError.conflict` when it differs from `expected`, stamp `updatedAt`, `write`. No `Lifecycle`, `Savings` or `Pricing` call. Paying off early and undoing it are saves of `paidOffAt`/`payoffAmount`.
- [ ] `Repository.deleteInstallment(id:)`: transaction, `remove("installment." + id)` (queues the tombstone).
- [ ] Tests (`RepositoryTests` shape: temp store, `migrate`, actor call, assert `document()` / `pendingCloudWrites()`):
  - Save round-trip puts `installment.<id>` in `pendingCloudWrites`; a stale `expected` from a second connection throws `conflict`.
  - `mergeCloud` applies a valid plan, deletes on nil, skips an invalid payload and an id/key mismatch.
  - A plan outside the editor's choices (every week, 480 payments) merges and `CloudRecords.entries` re-encodes it byte-identically, so `link()` never rewrites it.
  - Erase tombstones local plans and `additionalCloudKeys: ["installment.remote"]`.
  - A document without an `"installments"` key decodes with `[]`; `legacy-current-v1.json` and `legacy-older.json` still migrate unchanged; v2 is accepted and v3 rejected next to the existing v99 case.
  - A plan-free export is v1 and an export with a plan is v2.
  - A plan without optionals re-encodes with no added key.
- [ ] Update `apps/ios/CLAUDE.md` (iCloud key list gains `installment.<id>`), `apps/ios/Docs/FEATURE-PARITY.md` (StoreDoc shape, key set) and `apps/ios/Docs/MIGRATION-RELEASE.md` (the "StoreDoc v1" line).

**Commit:** `feat(core): store and sync installment plans`

## Task 3: installments in Home totals and the calendar (core)

**Files:** `Projection.swift`, `Installments.swift`, `Repository.swift`, new tests in `InstallmentTests.swift` and `SavingsTests.swift`.

- [ ] `CalendarEvent` gains `installment: InstallmentMark? = nil`, following `purchase: Bool? = nil`:

```swift
public struct InstallmentMark: Codable, Equatable, Sendable {
    public var number: Int?      // nil for an early payoff
    public var count: Int
    public var paid: Bool?
    public var symbol: String
    public var tint: String
}
```

  Installment payments keep `kind = .payment`, so every existing `.payment` sum includes them; a new `EventKind` would drop them from day totals, push them into Home `decisions` (`kind != .payment`) and crash `Display.event`'s force-unwrap. `subscriptionId` carries the plan id; `id` is prefixed `installment:` when the mark is set. `name` is the plan name, `domain` the lender domain.
- [ ] `Installments.events(_ plans:, from:, through:, today:, rates:, currency:)` — schedule payments and the payoff in the window, converted with `rates.convert` to the preferred currency, marked `paid` per the schedule (a payoff once its day has come, matching `totals`).
- [ ] `InstallmentRow` (`Codable`): `plan`, `paidCount`, `count`, `paid`, `left` and `nextAmount` in the plan currency; `nextConverted` in the preferred currency; `nextDate`, `endDate`, `finished`; `overpayment` = `spent − price` (nil without a price or when negative).
- [ ] `Projection.presentation`:
  - Add plan events for this month, next month and the previous month to `monthTotal`, `monthEvents`, `paymentDays`, `nextMonth`, `previousMonth`, re-sorted with the `payments` comparator (date ascending, amount descending).
  - `remaining` = this month's events with `date >= today && installment?.paid != true`.
  - Do **not** add them to `monthly`, `yearly`, `upcoming`, `decisions` or `savings`. Do not pass plans through the `active` gate: a plan whose last payment was on the 5th still counts for this month.
  - `Presentation.installments: [InstallmentRow]? = nil` (optional, because `LaunchCache` decodes cached Presentations), sorted active-first by next date; computed `installmentCount`. `totalCount` stays subscriptions-only. `launchPreview` keeps the first 40 rows.
- [ ] `Repository.calendar` and `Projection.events` merge plan events before the single final sort, so the month calendar, Year view, `DueView` and Live Activities see them in order.
- [ ] Tests, each failing without the change:
  - A UAH plan plus a USD subscription: `monthTotal`, `remaining`, `paymentDays`, `nextMonth`, `previousMonth` include the converted plan payments, while `monthly`, `yearly` and `savings.total` equal the subscription-only values.
  - A plan whose last payment was earlier this month still counts in `monthTotal` and not in `remaining`.
  - `paidAtPurchase` on a plan created today: payment 1 is in `monthTotal`, not in `remaining`.
  - An early payoff appears once on its day with its amount and later payments disappear; `overpayment` follows `spent`.
  - `nextConverted` of a UAH plan with USD preferred is converted.
  - A `Presentation` and a `CalendarEvent` encoded without the new fields still decode.
  - `store.calendar` returns plan events in the comparator order.

**Commit:** `feat(core): count installments in month totals and the calendar`

## Task 4: installment reminders and the paid-off moment (core)

**Files:** `Reminders.swift`, `PromptPolicy.swift`, `Tests/SubEyeCoreTests/ReminderTests.swift`, `Tests/SubEyeCoreTests/PromptPolicyTests.swift`.

- [ ] `ReminderSettings`: add `installments = false` and `installmentLeadDays = [1]`, **to the hand-written `CodingKeys`** (a property missing there is silently never saved) and to `init(from:)`: `installments` decodes with `try?` and falls back to the decoded `renewals`; leads go through `Self.leads(_, fallback: [1])`. In `effective(pro:)` force `installmentLeadDays = [1]` for free — do not copy the `trials = false` line.
- [ ] `ReminderPlanner.plan` gains `installments: [InstallmentPlan] = []`. Refactor the nested `collect` to take an optional rule source instead of a `SubscriptionRow`; installments pass none, so they never get a repeat rule. For each plan with the switch on, take its next three unpaid payments (`Installments.payments(_, today: Day.today(now, zone: zone))`) and convert each amount with `rates.convert(from: plan.currency, to: currency)` — digests add amounts together:
  - non-final payments → kind `installment`;
  - the final payment → kind `installmentFinal` ("Last payment tomorrow"), instead of an extra event, so one charge never gets two notifications;
  - when `paidOffAt` is nil and the final payment is among those three or already past → one `installmentPaidOff` event on final date + 1, lead 0, amount 0 (no-amount copy). Final + 1 matches the paid-by-date rule; the final day itself would call the plan paid off before the charge.
  All three are collected into the same `groups` before the shared sort and `prefix(limit)`. Each kind is its own group key, so installment digests never merge with "Renewing tomorrow".
- [ ] `ReviewState.cooled(now:) -> Bool` (computed: `askedAt == 0` or 180 days since; no stored field — a new stored field would reset every user's cooldown). `PromptPolicy.home` gains `celebrating: Bool = false` and `reviewCooled: Bool = true`: after `interrupted` and `remindersPending`, `celebrating && reviewCooled` returns `.review`, ahead of the Pro pitch and without `isDue`'s three-tracked and seven-day checks.
- [ ] Tests:
  - A monthly plan on day 12 — which would earn a repeat rule as a subscription — yields only `repeatRule == nil` reminders.
  - The final payment appears once, under `installmentFinal`.
  - The paid-off reminder fires on final + 1 and is absent when `paidOffAt` is set.
  - 200 subscriptions plus plans → exactly 56, all in the future.
  - `pro: false` keeps installments on with leads `[1]`; Pro keeps `[0, 3]`.
  - Settings `{"renewals":true}` decode to `installments == true`, `{}` to false, a fresh `ReminderSettings()` is false.
  - An installment and a renewal on the same morning produce two groups.
  - A UAH plan digest with USD preferred carries converted amounts.
  - `celebrating` respects `interrupted`, `remindersPending` and the cooldown, and outranks `.pro`.
- [ ] Extend the English copy dictionary in `ReminderTests` with the new keys.

**Commit:** `feat(core): plan one-shot installment reminders`

## Task 5: the installment editor and the add menu (app)

**Files:** new `Shared/InstallmentStyle.swift`, `SubEye/UI/Design.swift`, `SubEye/UI/Components.swift`, new `SubEye/UI/InstallmentEditor.swift`, `SubEye/UI/EditorView.swift` (`BrandPicker` `popular:` parameter only), `SubEye/Services/LogoService.swift` (lender list), `SubEye/App/SceneState.swift`, `SubEye/App/MainShell.swift`, strings, `xcodegen`.

- [ ] `Shared/InstallmentStyle.swift` (compiled into the app and the widget): the fixed tint tokens with their colours, the curated SF Symbol list (~24: phone, laptop, car, house, sofa, appliance, TV, education, medical, travel, gift, tools, bike, game, camera, clothes, pet, jewellery, building, bag, cart, banknote, card, other), and the fallbacks — `creditcard` for an unknown symbol (checked with `UIImage(systemName:)`), the accent for an unknown token. Move `Color(hex:)` from `Design.swift` to `Shared/` so both targets can use it. Token names are permanent once synced.
- [ ] `InstallmentPlan.installmentKind: InstallmentKind?` (computed from `kind`), used by the editor's kind choice and the list and detail labels.
- [ ] `InstallmentIcon` in `Components.swift`: a `ToneIcon`-style tinted circle with the symbol, plus `BrandIcon(name: lenderName, domain: lenderDomain)` at ~0.45× as a bottom-trailing badge with a background ring, as the payment rail does. No badge without a lender domain.
- [ ] `SheetRoute.installmentEditor(InstallmentPlan?)` (id `"installment:" + (id ?? "new")`) and its `destinationSheet` arm.
- [ ] `AddSubscriptionButton` becomes a `Menu` that keeps identifier `addSubscription`, with "Subscription" (`newSubscription`) and "Installment or loan" (`newInstallment`). `EmptySubscriptions` drops `addSubscription` and offers both as `emptyNewSubscription` / `emptyNewInstallment`, so no identifier matches two elements.
- [ ] `InstallmentEditor`: one page built from `AppSection`/`FormField`/`KeyboardAwareScrollView`, with the subscription editor's dirty tracking, discard menu, `interactiveDismissDisabled` and sticky primary `ActionButton`:
  - **What:** name; purpose icon grid and tint row from `InstallmentStyle`; kind (`SheetChoice`: pay in parts / card installment / loan).
  - **Lender (optional):** `BrandPicker` with a `popular:` list — monobank.ua, privatbank.ua, pumb.ua, abank.com.ua, klarna.com, affirm.com, paypal.com, afterpay.com (check each logo resolves through `LogoService`). Picking sets `lenderName`/`lenderDomain` and never overwrites the plan name. No russian banks.
  - **Terms:** currency (`CurrencyPicker`); payment, number of payments and total — entering two derives the third (`Installments.regularPayment` for payment-from-total, asking for the payment when it returns nil), with a live line "{payment} × {count} · last {last} · total {total}"; interval (monthly / every 2 weeks, a two-choice control, not `CadenceField`); first payment date (UTC picker, default today); "First payment charged at purchase" toggle, shown when the first payment date is the plan's local creation day (today for a new plan, `Day.today(Day.parse(original.createdAt)!, zone: .current)` for an edit), on by default.
  - **Purchase price (Pro):** free users see a locked row that opens a local paywall sheet; Pro sees the field and the derived overpayment ("You pay {amount} more · {percent}").
  - **Notes.**
- [ ] Amount fields parse with `Money.parse(_, below: 1e12)` — not `Display.amount`, which uses the 1e8 ceiling. On save, `paidAtPurchase` is `true` only when the toggle is on **and** the first payment date is that creation day; otherwise nil. A stored plan whose terms fall outside `Installments.editorAccepts` (written by a later build) shows those terms read-only instead of coercing them.
- [ ] Save calls `services.repository.saveInstallment(value, expected: original, now:)`. For a new plan it then calls `PromptCoordinator.afterCreation` and, when that returns true, presents `PromptView(.reminders)` in a nested sheet with `onDismiss: { dismiss() }`, exactly as `EditorView.swift:60-64, 359-365` do; `afterCreation` records the offer as asked before returning, so ignoring its result would burn it. Then `state.reload += 1`.
- [ ] Strings (en + uk) for the menu items, every editor label, footer and error.

**Commit:** `feat(ios): add the installment editor and the add menu`

## Task 6: the installment detail screen (app)

**Files:** new `SubEye/UI/InstallmentDetail.swift`, `SubEye/App/SceneState.swift`, `SubEye/App/MainShell.swift`, strings, `xcodegen`.

- [ ] `Route.installment(String)` and `SheetRoute.installmentPayoff(String)` with their `destination` / `destinationSheet` arms.
- [ ] The screen looks the plan up in `state.presentation.installments`. Hero: large `InstallmentIcon` (a `BrandWash` background when there is a lender domain). Progress: `SpendTrack` bar, "{paid} of {count} paid", paid and left to pay in the plan currency, next payment with `Display.when`, end date. A finished plan shows "Paid off" with the date.
- [ ] Schedule: every payment with its date, amount and paid/upcoming state (a `LazyVStack`; up to 360 rows).
- [ ] Overpayment row: Pro shows it when a price exists; free sees a locked teaser that opens the paywall.
- [ ] Reminder row: shows the installment reminder state; "Remind me" turns `installments` on and requests permission, mirroring the subscription detail's enabling task (`DetailView.swift:105-111`).
- [ ] Toolbar menu (`installmentActions`): Edit (`sheet = .installmentEditor(plan)`), Paid off early (the payoff sheet: date ≤ today in the preferred time zone — `Day.today(Date(), zone: preferredTimezone)`, not the device zone that `Day.today()` uses — amount defaulting to `Installments.remaining(on:)`), Undo paid off (when set), Delete (alert + `.task(id:)` like the subscription detail). No lifecycle actions.
- [ ] Lift only the file-private helpers it needs out of `DetailView.swift` (`BrandWash` and `ConfirmAction` are already internal); do not duplicate them.

**Commit:** `feat(ios): add the installment detail screen`

## Task 7: deep links, notifications, widget and Live Activity (app)

**Files:** `SubEye/App/SceneState.swift`, `SubEye/App/MainShell.swift`, `SubEye/App/AppServices.swift`, `SubEye/Services/NotificationService.swift`, `SubEye/Services/LiveActivityService.swift`, `SubEye/Services/WidgetPublisher.swift`, `Shared/WidgetSnapshot.swift`, `SubEyeWidget/WidgetBundle.swift`, strings, `SubEyeTests/WidgetTests.swift`, new `SubEyeTests/InstallmentCopyTests.swift`.

- [ ] `SceneState.listSegment` (`subscriptions` / `installments`). It lives on `SceneState`, not `DeviceSettings`, because `adopt()` replaces settings on every reload. Everything reads the **effective** segment, `installmentCount > 0 ? listSegment : .subscriptions`, so deleting the last plan (or a stale link) never strands the tab on a hidden segment.
- [ ] `DeepLink.route` returns a small target struct (tab, route, sheet, segment) instead of the tuple. `installments/<id>` → Subscriptions tab, Installments segment, `.installment(id)`; `installments` → the segment alone. `MainShell.route` sets `state.listSegment` and resets `paths[.subscriptions]` whenever a segment is given, then appends the route, so a digest tap never lands on a previously pushed subscription.
- [ ] `MainShell`: `openInstallment` next to `openSubscription` so the Duo's leading column highlights the open plan; `unselected` shows a plan placeholder on the Installments segment and stops requiring `totalCount > 0` when only plans exist.
- [ ] `AppServices.synchronizeSurfaces` passes the document's plans to notifications.
- [ ] `NotificationService`: pass `installments` into the planner (and into the development preview, one shape per new kind, staying within the 64 total); installment kinds deep-link to `installments/<id>` (one event) or `installments` (digest), on thread `subeye-installments`.
- [ ] Notification copy, en + uk: `notif_installment*`, `notif_installmentFinal*`, `notif_installmentPaidOff*`, each with `Title`, `Body`, `BodyNoAmount`, `DigestTitle`, `DigestTitleMixed` (15 keys per locale; the paid-off `Body` and `DigestTitleMixed` are unreachable but kept for symmetry). `InstallmentCopyTests` renders `message(L, …)` for each kind — single, digest, mixed leads, no amount — in both locales and asserts nothing starts with `notif_`.
- [ ] `LiveActivityService`: extract `static func renewalEvents(_ events:) -> [CalendarEvent]` (`kind == .payment && installment == nil`), use it where `.payment` is filtered today, and unit-test it with an installment-only day inside the window. Without it a plan payment starts a "Renews today" activity with a Cancel button that opens an empty sheet.
- [ ] Widget (Pro list only): `WidgetItem` gains optional `link`, `symbol` and `tint`; `WidgetPublisher` merges each active plan's next unpaid payment, using `nextConverted`, into the list before `prefix(3)` and `alsoDue`. Both widget links (`WidgetBundle.swift:47` small, `:202` medium) use `item.link ?? "subscriptions/" + item.id`; `SurfaceLogo` gains optional, defaulted `symbol`/`tint` parameters and falls back to the symbol before the initial. Keep `WidgetSnapshot.v == 1`. The free widget's month total includes plans automatically, matching Home.
- [ ] Tests in `WidgetTests`: free snapshot has no plan items; Pro has them in date order, counted in `alsoDue`, with a UAH plan shown converted to USD; a v1 `WidgetItem` JSON without the new fields decodes; `DeepLink` routes `installments/<id>` and `installments` to the right target.

**Commit:** `feat(ios): route installment reminders, widget items and deep links`

## Task 8: installments in the calendar and the Home rail (app)

**Files:** `SubEye/UI/Components.swift`, `SubEye/UI/HomeView.swift`, `SubEye/UI/CalendarView.swift`, `SubEye/App/MainShell.swift` (`DueView`), strings.

- [ ] `EventCell`: when `event.installment` is set, show `InstallmentIcon`, a non-renewal icon, and "Payment {number} of {count}" / "Last payment" / "Paid off early" instead of `calendar_kindPayment` ("Renews").
- [ ] Draw `InstallmentIcon` instead of `BrandIcon` for marked events where icons are drawn directly: the Home payment rail (`HomeView.swift:98`, 22 pt) and the calendar day tiles (`CalendarView.swift:205`, 20/30/22 pt).
- [ ] Route by source everywhere an event is tapped — Home payment rail and decisions, calendar agenda and day tiles, `DueView` — `Route.installment` for a mark, `Route.subscription` otherwise, `.due(day)` for several owners. `DueView(ids:)` resolves plan ids too and never attaches the swipe Cancel to a plan event.
- [ ] Strings (en + uk) for the event labels.

**Commit:** `feat(ios): show installments in the calendar and the Home rail`

## Task 9: the Installments list, Home card, settings and Pro page (app)

**Files:** `SubEye/UI/SubscriptionsView.swift`, new `SubEye/UI/InstallmentsList.swift`, `SubEye/UI/HomeView.swift`, `SubEye/UI/NotificationsView.swift`, `SubEye/UI/SettingsView.swift`, `SubEye/UI/PaywallView.swift`, `SubEye/App/MainShell.swift` (`PromptView`, `root`, prompt task), `SubEye/Services/PromptCoordinator.swift`, strings.

- [ ] `SubscriptionsView`: a segmented Subscriptions | Installments picker at the top when `installmentCount > 0`, bound to the effective segment. The Installments segment shows `InstallmentsList` — "Active" by next payment, "Paid off" by end date, rows `RouteLink(.installment(id))` with identifier `installment-<id>`, amounts in the plan currency — and hides the subscription filter menu and the monthly/yearly cards; its search field filters plans by name and lender. The Subscriptions segment keeps everything as it is, with its own empty state when only plans exist.
- [ ] `HomeView`: the empty state needs `totalCount == 0 && installmentCount == 0`. When plans exist, an Installments card after the month card (summary column on the Duo), modelled on `savedRow`: "Active: {count} · next {amount} {when}" (`nextConverted`), opening the list through an `openInstallments` closure from `MainShell.root(.home)` that sets the tab, the segment and `paths[.subscriptions] = []`.
- [ ] `NotificationsView`: an Installments section when plans exist — the switch and, for Pro, the lead days (generalise `leads(trial:)` to a key path). The permission request condition becomes `renewals || trials || installments`. `PromptView.enableReminders` also turns `installments` on. The Settings Reminders row (`SettingsView.swift:63`) reads On and the bell when `renewals || trials || installments`.
- [ ] Prompts: `MainShell` passes `tracked: totalCount + installmentCount` to `PromptCoordinator.home` and includes it in the prompt task's id (`MainShell.swift:94, 100`). `remindersPending` considers `installments`. `home` passes `celebrating` when a plan finished within the last 30 days, was created before it finished (`createdAt` ≤ its final payment or payoff date), and is not in the `installments.celebrated` setting, plus `reviewCooled` from `ReviewState.cooled`. It writes the plan id into `installments.celebrated` only in the `.review` branch after the sandbox guard, next to `review.askedAt`, so an interrupted or cancelled evaluation never uses up a celebration. Test that in `LaunchTests`.
- [ ] `PaywallView`: replace the parallel `features`/`icons` arrays and the `index == 4` widget checks with a keyed feature list, then add an Installments page ("See what a credit really costs, choose when installment reminders arrive, and keep the next payment on your Home Screen") with its own preview. Update `PromptView.proFeatures`.
- [ ] Reword copy that now undersells plans, en + uk: `subs_add` (the menu label becomes a neutral "Add"), `native_noSubscriptions`, `native_emptyBody`, `native_widgetPro`, `native_widgetDescription`, `settings_eraseConfirmBody`, `settings_syncHint`, `native_importBody`, `prompt_remindersBody`, `home_attnPayment`.

**Commit:** `feat(ios): add the installments list, Home card and Pro page`

## Task 10: fixtures, scenarios and UI tests (app)

**Files:** `SubEye/App/NativeTesting.swift`, `SubEye/App/DeveloperScenario.swift`, `SubEye/UI/SettingsView.swift` (developer section), `SubEyeUITests/SubEyeUITests.swift`, `SubEyeDeviceTests/DeviceAcceptanceTests.swift`, `apps/ios/README.md`.

- [ ] `NativeTesting`: an opt-in `--fixture-installments N` (existing `--fixture-count` runs stay plan-free); `seedPortfolio` adds three plans (monobank pay in parts in UAH, a Klarna every-two-weeks plan, a USD loan with a price) and its footnote says so; `clearDeveloperData` and `empty` remove plans.
- [ ] `DeveloperScenario`: installment scenarios — mid-plan, last payment tomorrow, paid off, paid off early, month-end anchor — seeded through `importArchive` and opening `InstallmentDetail`; the Developer Tools screen lists them. `DeveloperOverride`'s reminders switch also sets `installments`.
- [ ] UI tests: a `startSubscription(app)` helper — tap `app.navigationBars.buttons["addSubscription"]`, then `app.buttons["newSubscription"].firstMatch` — replacing the six direct taps in `SubEyeUITests` (`:56, :85, :156, :182, :329, :364`) and three in `DeviceAcceptanceTests` (`:95, :143, :181`). The `waitForExistence` checks stay as they are (`:393` sits inside the inverted "offer must not repeat" expectation). Empty-store tests use `emptyNewSubscription`.
- [ ] New UI tests: add an installment in English and Ukrainian; the switch appears only with plans; the Home card opens the list; the largest-text Ukrainian audit covers the Subscriptions tab with `--fixture-installments` on both segments, the Home card and the detail screen. If the audit shows the switch truncating, use a menu picker at accessibility sizes.
- [ ] README: the new launch argument, the test coverage and the strings key-parity command.

**Commit:** `test(ios): cover installments in fixtures, scenarios and UI tests`

## Task 11: legal pages, site and release docs

**Files:** `packages/legal/src/privacy-policy.ts`, `packages/legal/src/terms-of-service.ts`, `apps/ios/SubEye/Resources/legal-{en,uk}.json` (generated), `apps/landing/src/i18n/{en,uk}.ts`, `docs/landing/DESIGN-BRIEF.md`, `docs/release/{STORE-METADATA,PAYMENTS-BRIEF}.md`.

- [ ] Privacy policy, both locales: name installment plans and loans wherever stored or synced data is listed (lender name and website, amounts, dates, purchase price), and say the lender's website goes to Brandfetch and Google favicons exactly like a subscription's. Keep section ids; move `updated`.
- [ ] Terms, both locales: "what SubEye is", "your data", and the Free/Pro lists. Price literals change only in Task 12. Move `updated`.
- [ ] `bun apps/ios/Contracts/resources.ts` to regenerate the bundled legal JSON (nothing checks it matches).
- [ ] `DESIGN-BRIEF.md` first (it owns the landing's feature claims), then the landing pricing `freeItems`/`proItems` and one `does` line in en + uk. No mockup with numbers — that would need a TypeScript port of the schedule.
- [ ] `STORE-METADATA.md`: What's New (including "update SubEye on every device you sync"), description lines, the App Review note that SubEye tracks repayments of credit the user already has and offers, brokers or advertises none (Guideline 3.2.1(viii)), and the IAP description. Keyword changes are Yehor's call at release — candidates: en "installment, loan, bnpl"; uk "розстрочка, кредит, частинами" — each replaces an existing word.
- [ ] `PAYMENTS-BRIEF.md`: rewrite the Free/Pro table (it still lists renewal reminders as Pro) with the installment split.

**Commit:** `docs: describe installments in the legal pages, site and release docs`

## Task 12: the price change (at release)

Blocked on Yehor setting $14.99 for `cc.subeye.app.pro.lifetime` in App Store Connect with Apple's default conversion.

- [ ] Read the resulting USD, UAH and EUR storefront prices in App Store Connect; set `proPrice` in `apps/landing/src/lib/site.ts`.
- [ ] Update the price literals in both terms locales (pinned against `proPrice` by `apps/landing/test/pricing.test.ts`), regenerate the legal JSON, and update the `$11.99` lines in `docs/release/PAYMENTS-BRIEF.md`, `docs/landing/DESIGN-BRIEF.md` and `docs/landing/SETUP-BRIEF.md`.
- [ ] The app reads its price from the RevenueCat `Package`; no app change.
- [ ] Deploy the site with `bun run --cwd apps/landing deploy` the day the build goes live.

**Commit:** `chore(pricing): raise Pro to $14.99`

## Task 13: verify

- [ ] `swift test --package-path apps/ios/SubEyeCore`.
- [ ] Strings: `plutil -lint` both files and the key-parity `diff` from Global constraints.
- [ ] `rtk proxy xcodegen generate --spec apps/ios/project.yml`; Release build on the iPhone 17 Pro simulator; `SubEyeTests` with `-only-testing:SubEyeTests`; the changed and new UI tests with `-only-testing`, not the full 13-minute suite.
- [ ] `bun run lint`, `bun run type-check`, `bun run test`, `bun run check:boundaries`; `bun run --cwd packages/legal test`; `bun run --cwd apps/landing build`.
- [ ] Manual on the iPhone 17 simulator, en and uk, light and dark, largest text: add each kind; month-end and every-two-weeks schedules; a VND loan over 100,000,000; Home card and totals with a UAH plan and USD preferred; a calendar day with a renewal and an installment; detail, payoff and undo; deleting the last plan from the Installments segment; reminders preview; Pro and free paywall entry points; widget as Pro; the iPhone Duo two-column layout.
- [ ] Physical device before release (`apps/ios/CLAUDE.md`): reminders deliver once per payment and stop with the plan, the paid-off notice, two-device iCloud union of `installment.<id>` with a 6.2.0 device in the mix, widget items, erase.

## Known limits accepted in v1

- One-shot reminders cover the next three payments per plan and refill when the app opens — an every-two-weeks plan goes quiet after about six weeks without a launch, like one-shot subscription reminders today.
- Repeating subscription reminders sort ahead of one-shots, so a Pro user who fills the 56-slot budget with repeating rules loses installment reminders first. The Notifications screen's existing budget hint covers it.
- 6.2.0 devices ignore `installment.*` keys, their Erase leaves them in iCloud, and they refuse a v2 archive with their generic "Please try again". What's New asks users to update every device.
- Two decimals for every currency, as everywhere in the app.
- The celebration marker and the review cooldown are per device, like the existing review prompt.

## Explicitly not doing

The cross-plan overview and monthly-load chart; Extend term; categories on plans; an interest-rate calculator; per-payment confirmation; bank integration; Live Activities for installments; a landing mockup with numbers.

## Reported, not fixed here

- `Dashboard.yearly` uses an inclusive `today…today+12 months` window (`Projection.swift:169`), so a monthly subscription charged on today's day of the month counts 13 times in "Estimated yearly".
- `Dashboard.upcoming` and `Dashboard.activeCount` are computed and never read.
- `notifs_repeats`, `native_exportPrivacy`, `subscriptions_title` and `due_title` are unused string keys.
- `mergeCloud`'s `initialLink` parameter is passed only by `RepositoryTests.swift:84`; production `link()` uses the default.
