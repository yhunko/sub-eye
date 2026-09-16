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
    private func subscription(_ id: String, date: String) -> Subscription { Subscription(id: id, name: id, cost: "10", currency: "usd", paymentDate: Day.iso(Day.parse(date)!), now: now) }
    private func rows(_ subscriptions: [Subscription]) -> [SubscriptionRow] { Projection.rows(StoreDocument(preferences: .init(currency: "usd"), subscriptions: subscriptions), rates: rates, now: now) }
}
