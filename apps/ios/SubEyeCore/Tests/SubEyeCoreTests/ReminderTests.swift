import XCTest
@testable import SubEyeCore

final class ReminderTests: XCTestCase {
    let now = Day.parse("2026-09-15T07:00:00Z")!
    let rates = ExchangeRates(rates: ["usd": 1])
    func testOldPartialAndInvalidSettingsUseSafeDefaults() throws {
        let settings = try JSONCodec.decode(ReminderSettings.self, Data(#"{"renewals":true,"hour":91,"trialLeadDays":[7,7,9],"minute":"bad"}"#.utf8))
        XCTAssertTrue(settings.renewals); XCTAssertEqual(settings.hour, 9); XCTAssertEqual(settings.minute, 0)
        XCTAssertEqual(settings.trialLeadDays, [7]); XCTAssertFalse(settings.trials)
        let list = try JSONCodec.decode(ListOptions.self, Data(#"{"group":"obsolete","sort":"name"}"#.utf8))
        XCTAssertEqual(list.sort, "name"); XCTAssertEqual(list.group, "none"); XCTAssertEqual(list.status, "active")
        let calendar = try JSONCodec.decode(CalendarOptions.self, Data(#"{"maxIcons":3}"#.utf8))
        XCTAssertTrue(calendar.showDayTotals); XCTAssertEqual(calendar.weekStart, "monday")
    }
    func testPermanentMonthlyRemindersGroupAndFreeSettingsStayLimited() {
        let rows = rows([subscription("a", date: "2026-09-20"), subscription("b", date: "2026-09-20")])
        var settings = ReminderSettings(); settings.renewals = true; settings.trials = true; settings.renewalLeadDays = [0, 1, 3, 7]
        let planned = ReminderPlanner.plan(rows: rows, settings: settings, pro: false, rates: rates, currency: "usd", now: now, zone: .gmt)
        XCTAssertEqual(planned.count, 1); XCTAssertEqual(planned[0].events.count, 2); XCTAssertEqual(planned[0].lead, 1)
        XCTAssertEqual(planned[0].repeatRule?.day, 19)
    }
    func testMonthEndAndCancellingDoNotRepeatIndefinitely() {
        var cancelling = subscription("b", date: "2026-09-20"); cancelling.willBeCancelledAt = "2026-10-01T00:00:00Z"
        let rows = rows([subscription("a", date: "2026-01-31"), cancelling])
        var settings = ReminderSettings(); settings.renewals = true
        let planned = ReminderPlanner.plan(rows: rows, settings: settings, pro: true, rates: rates, currency: "usd", now: now, zone: .gmt)
        XCTAssertTrue(planned.allSatisfy { $0.repeatRule == nil })
        XCTAssertEqual(planned.flatMap(\.events).filter { $0.subscriptionId == "b" }.count, 1)
    }
    func testBudgetAndLocalWallClockSkipPastTriggers() {
        let subscriptions = (0..<200).map { index -> Subscription in
            var value = subscription(String(index), date: Day.key(Day.shift(Day.floor(now), days: index + 1)))
            value.every = 2; return value
        }
        let plans = (0..<20).map { plan("plan" + String($0), first: Day.key(Day.shift(Day.floor(now), days: $0 + 1)), count: 12, every: 2, period: .week) }
        var settings = ReminderSettings(); settings.renewals = true; settings.renewalLeadDays = [0, 1, 3, 7]
        settings.installments = true; settings.installmentLeadDays = [0, 1, 3, 7]
        let planned = ReminderPlanner.plan(rows: rows(subscriptions), installments: plans, settings: settings, pro: true, rates: rates, currency: "usd",
                                           now: now, zone: TimeZone(identifier: "Europe/Kyiv")!)
        XCTAssertEqual(planned.count, 56); XCTAssertTrue(planned.allSatisfy { $0.fireAt > now })
        XCTAssertTrue(planned.contains { $0.kind == "installment" })
    }
    func testRepeatRulesCannotDriftAfterFebruaryOrStartBeforeFutureAnchor() {
        let february = Day.parse("2027-02-01T07:00:00Z")!
        var leap = subscription("leap", date: "2024-02-29"); leap.period = .year
        var march = subscription("march", date: "2024-03-01"); march.period = .year
        var future = subscription("future", date: "2028-01-20"); future.period = .day
        let rows = Projection.rows(StoreDocument(subscriptions: [subscription("month-end", date: "2026-01-31"), leap, march, future]), rates: rates, now: february)
        for row in rows {
            XCTAssertNil(ReminderPlanner.repeatRule(row, lead: 1, hour: 9, minute: 0, now: february, zone: .gmt), row.id)
        }
    }
    func testCopyNamesTheDayInsteadOfAGenericUpcomingRenewal() {
        var settings = ReminderSettings(); settings.renewals = true; settings.renewalLeadDays = [0, 1]
        let single = ReminderPlanner.plan(rows: rows([subscription("Netflix", date: "2026-09-16")]), settings: settings, pro: true,
                                          rates: rates, currency: "usd", now: now, zone: .gmt).map(message)
        XCTAssertEqual(Set(single.map(\.title)), ["Netflix renews today", "Netflix renews tomorrow"])
        XCTAssertEqual(single.first?.body, "$10.00 will be charged.")

        settings.renewalLeadDays = [3]
        let digest = ReminderPlanner.plan(rows: rows(["a", "b", "c", "d"].map { subscription($0, date: "2026-09-20") }), settings: settings,
                                          pro: true, rates: rates, currency: "usd", now: now, zone: .gmt).map(message)
        XCTAssertEqual(digest, [ReminderMessage(title: "Renewing in 3 days", body: "a, b, c and 1 more · $40.00")])
    }
    func testOneMorningCoveringDifferentDueDaysDoesNotClaimASingleDay() {
        var settings = ReminderSettings(); settings.renewals = true; settings.renewalLeadDays = [1, 3]
        let planned = ReminderPlanner.plan(rows: rows([subscription("a", date: "2026-09-20"), subscription("b", date: "2026-09-22")]),
                                           settings: settings, pro: true, rates: rates, currency: "usd", now: now, zone: .gmt)
        let shared = planned.first { $0.events.count == 2 }
        XCTAssertNil(shared?.lead)
        XCTAssertEqual(shared.map(message)?.title, "Upcoming renewals")
    }
    func testLicenseRenewalsSayUpdatesEndWhileItsPurchaseStaysARenewal() throws {
        var settings = ReminderSettings(); settings.renewals = true
        func planned(purchase: String) throws -> [PlannedReminder] {
            var sub = Subscription(id: "c", name: "CleanShot X", cost: "19", currency: "usd", period: .year, paymentDate: Day.iso(Day.parse(purchase)!), now: now)
            let phases = try Pricing.license(subscription: &sub, licenseCost: "41", renewalCost: "19", currency: "usd", now: now, ids: ("l", "r"))
            let rows = Projection.rows(StoreDocument(preferences: .init(currency: "usd"), subscriptions: [sub], phases: phases), rates: rates, now: now)
            return ReminderPlanner.plan(rows: rows, settings: settings, pro: false, rates: rates, currency: "usd", now: now, zone: .gmt)
        }
        let fresh = try planned(purchase: "2026-09-16")
        XCTAssertEqual(fresh.map(\.kind), ["renewal", "updates", "updates"])
        XCTAssertEqual(message(fresh[0]).title, "CleanShot X renews tomorrow")
        XCTAssertEqual(message(fresh[1]), ReminderMessage(title: "CleanShot X updates end tomorrow", body: "Renew for $19.00 to keep getting them. The app stays yours."))
        let owned = try planned(purchase: "2024-09-16")
        XCTAssertEqual(owned.count, 1); XCTAssertEqual(owned[0].kind, "updates"); XCTAssertNotNil(owned[0].repeatRule)
    }
    func testInstallmentsNeverRepeatWhereASubscriptionWould() {
        var settings = ReminderSettings(); settings.renewals = true; settings.installments = true
        let planned = ReminderPlanner.plan(rows: rows([subscription("netflix", date: "2026-08-12")]), installments: [plan("phone", first: "2026-08-12", count: 12)],
                                           settings: settings, pro: true, rates: rates, currency: "usd", now: now, zone: .gmt)
        XCTAssertNotNil(planned.first { $0.kind == "renewal" }?.repeatRule)
        let installments = planned.filter { $0.kind == "installment" }
        XCTAssertEqual(installments.map { Day.key($0.events[0].date) }, ["2026-10-12", "2026-11-12", "2026-12-12"])
        XCTAssertTrue(installments.allSatisfy { $0.repeatRule == nil })
    }
    func testTheFinalPaymentIsRemindedOnceAndThePlanIsPaidOffTheDayAfter() {
        var settings = ReminderSettings(); settings.installments = true
        let planned = ReminderPlanner.plan(rows: [], installments: [plan("phone", first: "2026-08-20", count: 3)], settings: settings, pro: false,
                                           rates: rates, currency: "usd", now: now, zone: .gmt)
        XCTAssertEqual(planned.map(\.kind), ["installment", "installmentFinal", "installmentPaidOff"])
        XCTAssertEqual(planned.map(\.fireAt), ["2026-09-19T09:00:00Z", "2026-10-19T09:00:00Z", "2026-10-21T09:00:00Z"].map { Day.parse($0)! })
        XCTAssertEqual(planned.flatMap(\.events).filter { Day.key($0.date) == "2026-10-20" }.count, 1)
        XCTAssertEqual(message(planned[1]), ReminderMessage(title: "Last phone payment tomorrow", body: "$100.00 and it is paid off."))
        XCTAssertEqual(planned[2].lead, 0)
        XCTAssertEqual(message(planned[2]), ReminderMessage(title: "phone is paid off", body: "That was the last payment."))
    }
    func testPaidOffNoticeNeedsTheFinalPaymentAndNoEarlyPayoff() {
        var settings = ReminderSettings(); settings.installments = true
        func kinds(_ plan: InstallmentPlan) -> [String] {
            ReminderPlanner.plan(rows: [], installments: [plan], settings: settings, pro: false, rates: rates, currency: "usd", now: now, zone: .gmt).map(\.kind)
        }
        XCTAssertEqual(kinds(plan("done", first: "2026-08-14", count: 2)), ["installmentPaidOff"], "A final payment made yesterday is paid off this morning")
        var early = plan("early", first: "2026-08-14", count: 6); early.paidOffAt = Day.iso(now); early.payoffAmount = "400.00"
        XCTAssertEqual(kinds(early), [])
        XCTAssertEqual(kinds(plan("long", first: "2026-08-14", count: 6)), ["installment", "installment", "installment"])
    }
    func testFreeKeepsInstallmentRemindersAtTheDayBefore() {
        var settings = ReminderSettings(); settings.installments = true; settings.installmentLeadDays = [0, 3]
        XCTAssertTrue(settings.effective(pro: false).installments)
        XCTAssertEqual(settings.effective(pro: false).installmentLeadDays, [1])
        XCTAssertEqual(settings.effective(pro: true).installmentLeadDays, [0, 3])
        settings.installmentLeadDays = [7, 9, 0, 7]
        XCTAssertEqual(settings.effective(pro: true).installmentLeadDays, [0, 7])
        settings.installmentLeadDays = [0, 3]
        func leads(pro: Bool) -> [String] {
            ReminderPlanner.plan(rows: [], installments: [plan("phone", first: "2026-09-20", count: 2)], settings: settings, pro: pro,
                                 rates: rates, currency: "usd", now: now, zone: .gmt).filter { $0.kind == "installment" }.map { Day.iso($0.fireAt) }
        }
        XCTAssertEqual(leads(pro: false), ["2026-09-19T09:00:00.000Z"])
        XCTAssertEqual(leads(pro: true), ["2026-09-17T09:00:00.000Z", "2026-09-20T09:00:00.000Z"])
    }
    func testInstallmentRemindersNeedTheirOwnSwitch() {
        func kinds(_ settings: ReminderSettings) -> [String] {
            ReminderPlanner.plan(rows: [], installments: [plan("phone", first: "2026-09-20", count: 6)], settings: settings, pro: true,
                                 rates: rates, currency: "usd", now: now, zone: .gmt).map(\.kind)
        }
        XCTAssertEqual(kinds(ReminderSettings()), [])
        var renewalsOnly = ReminderSettings(); renewalsOnly.renewals = true
        XCTAssertEqual(kinds(renewalsOnly), [], "Renewal consent carries over only when old settings decode, never at plan time")
    }
    func testInstallmentRemindersInheritRenewalConsentAndAreSaved() throws {
        func decode(_ json: String) throws -> ReminderSettings { try JSONCodec.decode(ReminderSettings.self, Data(json.utf8)) }
        XCTAssertTrue(try decode(#"{"renewals":true}"#).installments)
        XCTAssertFalse(try decode(#"{"renewals":true,"installments":false}"#).installments)
        XCTAssertFalse(try decode("{}").installments)
        XCTAssertFalse(ReminderSettings().installments)
        XCTAssertEqual(try decode(#"{"installmentLeadDays":[9]}"#).installmentLeadDays, [1])
        var settings = ReminderSettings(); settings.installments = true; settings.installmentLeadDays = [3, 7]
        XCTAssertEqual(try JSONCodec.decode(ReminderSettings.self, JSONCodec.encode(settings)), settings)
    }
    func testAnInstallmentNeverJoinsARenewalDigest() {
        var bimonthly = subscription("netflix", date: "2026-09-20"); bimonthly.every = 2
        var settings = ReminderSettings(); settings.renewals = true; settings.installments = true
        let planned = ReminderPlanner.plan(rows: rows([bimonthly]), installments: [plan("phone", first: "2026-09-20", count: 6)], settings: settings, pro: true,
                                           rates: rates, currency: "usd", now: now, zone: .gmt)
        XCTAssertEqual(planned.filter { $0.fireAt == Day.parse("2026-09-19T09:00:00Z")! }.map(\.kind).sorted(), ["installment", "renewal"])
    }
    func testInstallmentDigestsAddAmountsConvertedToThePreferredCurrency() {
        var settings = ReminderSettings(); settings.installments = true
        let plans = [plan("phone", first: "2026-09-20", count: 6, payment: 400, currency: "uah"), plan("sofa", first: "2026-09-20", count: 6, payment: 800, currency: "uah")]
        let planned = ReminderPlanner.plan(rows: [], installments: plans, settings: settings, pro: false, rates: ExchangeRates(rates: ["usd": 1, "uah": 40]),
                                           currency: "usd", now: now, zone: .gmt)
        XCTAssertEqual(message(planned[0]), ReminderMessage(title: "Installments due tomorrow", body: "phone, sofa · $30.00"))
    }
    private func message(_ reminder: PlannedReminder) -> ReminderMessage {
        let english = ["notif_whenToday": "today", "notif_whenTomorrow": "tomorrow", "notif_whenInDays": "in {days} days",
                       "notif_renewalTitle": "{name} renews {when}", "notif_renewalBody": "{amount} will be charged.",
                       "notif_renewalDigestTitle": "Renewing {when}", "notif_renewalDigestTitleMixed": "Upcoming renewals",
                       "notif_updatesTitle": "{name} updates end {when}", "notif_updatesBody": "Renew for {amount} to keep getting them. The app stays yours.",
                       "notif_installmentTitle": "{name} payment due {when}", "notif_installmentBody": "{amount} is due.",
                       "notif_installmentBodyNoAmount": "A payment is due.", "notif_installmentDigestTitle": "Installments due {when}",
                       "notif_installmentDigestTitleMixed": "Upcoming installment payments",
                       "notif_installmentFinalTitle": "Last {name} payment {when}", "notif_installmentFinalBody": "{amount} and it is paid off.",
                       "notif_installmentFinalBodyNoAmount": "One more payment and it is paid off.", "notif_installmentFinalDigestTitle": "Last payments {when}",
                       "notif_installmentFinalDigestTitleMixed": "Upcoming last payments",
                       "notif_installmentPaidOffTitle": "{name} is paid off", "notif_installmentPaidOffBody": "That was the last payment.",
                       "notif_installmentPaidOffBodyNoAmount": "That was the last payment.", "notif_installmentPaidOffDigestTitle": "Paid off {when}",
                       "notif_installmentPaidOffDigestTitleMixed": "Paid off",
                       "notif_digestBody": "{names} · {amount}", "notif_digestMore": "{names} and {count} more"]
        return reminder.message({ key, arguments in
            arguments.reduce(english[key] ?? key) { $0.replacingOccurrences(of: "{" + $1.key + "}", with: $1.value) }
        }, money: { String(format: "$%.2f", $0) })
    }
    private func subscription(_ id: String, date: String) -> Subscription { Subscription(id: id, name: id, cost: "10", currency: "usd", paymentDate: Day.iso(Day.parse(date)!), now: now) }
    private func plan(_ id: String, first: String, count: Int, payment: Int = 100, currency: String = "usd", every: Int = 1, period: BillingPeriod = .month) -> InstallmentPlan {
        InstallmentPlan(id: id, name: id, symbol: "iphone", tint: "blue", currency: currency, total: String(payment * count) + ".00", payment: String(payment) + ".00",
                        paymentCount: count, every: every, period: period, firstPaymentDate: Day.iso(Day.parse(first)!), now: now)
    }
    private func rows(_ subscriptions: [Subscription]) -> [SubscriptionRow] { Projection.rows(StoreDocument(preferences: .init(currency: "usd"), subscriptions: subscriptions), rates: rates, now: now) }
}
