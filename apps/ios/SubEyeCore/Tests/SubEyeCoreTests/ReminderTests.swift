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
        var settings = ReminderSettings(); settings.renewals = true; settings.renewalLeadDays = [0, 1, 3, 7]
        let planned = ReminderPlanner.plan(rows: rows(subscriptions), settings: settings, pro: true, rates: rates, currency: "usd", now: now, zone: TimeZone(identifier: "Europe/Kyiv")!)
        XCTAssertEqual(planned.count, 56); XCTAssertTrue(planned.allSatisfy { $0.fireAt > now })
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
    private func message(_ reminder: PlannedReminder) -> ReminderMessage {
        let english = ["notif_whenToday": "today", "notif_whenTomorrow": "tomorrow", "notif_whenInDays": "in {days} days",
                       "notif_renewalTitle": "{name} renews {when}", "notif_renewalBody": "{amount} will be charged.",
                       "notif_renewalDigestTitle": "Renewing {when}", "notif_renewalDigestTitleMixed": "Upcoming renewals",
                       "notif_digestBody": "{names} · {amount}", "notif_digestMore": "{names} and {count} more"]
        return reminder.message({ key, arguments in
            arguments.reduce(english[key] ?? key) { $0.replacingOccurrences(of: "{" + $1.key + "}", with: $1.value) }
        }, money: { String(format: "$%.2f", $0) })
    }
    private func subscription(_ id: String, date: String) -> Subscription { Subscription(id: id, name: id, cost: "10", currency: "usd", paymentDate: Day.iso(Day.parse(date)!), now: now) }
    private func rows(_ subscriptions: [Subscription]) -> [SubscriptionRow] { Projection.rows(StoreDocument(preferences: .init(currency: "usd"), subscriptions: subscriptions), rates: rates, now: now) }
}
