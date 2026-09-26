import XCTest
@testable import SubEyeCore

final class DomainTests: XCTestCase {
    let now = Day.parse("2026-09-15T12:00:00Z")!

    func testMonthEndReturnsToAnchorAndLeapYearRecovers() {
        let jan = Day.parse("2024-01-31")!
        XCTAssertEqual(Day.key(Recurrence.occurrence(anchor: jan, every: 1, period: .month, index: 1)), "2024-02-29")
        XCTAssertEqual(Day.key(Recurrence.occurrence(anchor: jan, every: 1, period: .month, index: 2)), "2024-03-31")
        let leap = Day.parse("2024-02-29")!
        XCTAssertEqual(Day.key(Recurrence.occurrence(anchor: leap, every: 1, period: .year, index: 4)), "2028-02-29")
    }

    func testCurrencyConversionDividesIntoBaseAndUsesCrossRates() {
        let rates = ExchangeRates(rates: ["usd": 1, "uah": 40, "eur": 0.8])
        XCTAssertEqual(rates.convert(100, from: "UAH", to: "usd"), 2.5)
        XCTAssertEqual(rates.convert(100, from: "uah", to: "eur"), 2)
        XCTAssertEqual(rates.convert(10, from: "unknown", to: "eur"), 10)
        XCTAssertEqual(Money.monthly(12, every: 1, period: .year), 1)
        XCTAssertEqual(Money.parse("1 234,50"), Decimal(string: "1234.50"))
        XCTAssertNil(Money.parse("12.34oops"))
    }

    func testCancellationPrecedenceAndLocalDay() throws {
        var sub = fixture()
        sub.willBeCancelledAt = "2026-09-16T00:00:00Z"
        sub.pausedAt = "2026-09-01T12:00:00Z"
        XCTAssertEqual(Lifecycle.status(sub, now: Day.parse("2026-09-15T22:00:00Z")!, zone: TimeZone(identifier: "Europe/Kyiv")!), .cancelled)
        XCTAssertEqual(Lifecycle.status(sub, now: Day.parse("2026-09-15T22:00:00Z")!, zone: TimeZone(identifier: "America/Los_Angeles")!), .cancelling)
        XCTAssertFalse(Lifecycle.includes(sub, occurrence: Day.parse(sub.willBeCancelledAt)!))
        let kept = try Lifecycle.change(sub, action: .keep, now: now, zone: .gmt)
        XCTAssertEqual(kept.paymentDate, sub.paymentDate)
        XCTAssertNil(kept.pausedAt)
    }

    func testPauseDoesNotRewriteChargeTakenEarlierThatDay() {
        var sub = fixture(); sub.pausedAt = "2026-09-15T12:00:00Z"; sub.resumeAt = "2026-10-15T00:00:00Z"
        XCTAssertFalse(Lifecycle.isPaused(sub, occurrence: Day.parse("2026-09-15")!))
        XCTAssertTrue(Lifecycle.isPaused(sub, occurrence: Day.parse("2026-09-16")!))
        XCTAssertFalse(Lifecycle.isPaused(sub, occurrence: Day.parse("2026-10-15")!))
    }

    func testDeferredDiscountRevertsAfterExactlyThreeCharges() throws {
        var sub = fixture()
        let phases = try Pricing.offer(subscription: &sub, promoCost: "5.00", standardCost: "20.00", currency: "usd", payments: 3,
                                       endDate: nil, deferred: true, now: now, zone: .gmt, ids: ("offer", "standard"))
        XCTAssertEqual(sub.cost, "20.00")
        let rates = ExchangeRates(rates: ["usd": 1])
        XCTAssertEqual(Pricing.amount(sub, phases: phases, on: Day.parse("2026-10-20")!, rates: rates, currency: "usd"), 5)
        XCTAssertEqual(Pricing.amount(sub, phases: phases, on: Day.parse("2026-12-20")!, rates: rates, currency: "usd"), 20)
    }

    func testApplyNowClosesPreviousWindowAndIsIdempotent() throws {
        var sub = fixture()
        var phases = try Pricing.offer(subscription: &sub, promoCost: "0", standardCost: "20.00", currency: "usd", payments: nil,
                                       endDate: Day.parse("2026-10-01"), deferred: false, now: now, zone: .gmt, ids: ("trial", "standard"))
        let later = now.addingTimeInterval(60)
        try Pricing.apply("standard", subscription: &sub, phases: &phases, now: later)
        let once = phases
        try Pricing.apply("standard", subscription: &sub, phases: &phases, now: later.addingTimeInterval(60))
        XCTAssertEqual(phases, once)
        XCTAssertEqual(Pricing.effective(phases, at: later)?.kind, .standard)
        XCTAssertNil(Pricing.upcoming(phases, at: later))
        XCTAssertEqual(sub.cost, "20.00")
    }

    func testDiscountReversionPreservesOriginalMonthEndAnchor() throws {
        var sub = fixture(); sub.paymentDate = "2026-01-31T00:00:00Z"
        let phases = try Pricing.offer(subscription: &sub, promoCost: "5", standardCost: "20", currency: "usd", payments: 2,
                                       endDate: nil, deferred: true, now: Day.parse("2026-02-01T12:00:00Z")!, zone: .gmt, ids: ("offer", "revert"))
        XCTAssertEqual(Day.key(Day.parse(phases[0].endsAt)!), "2026-04-30")
        let rates = ExchangeRates(rates: ["usd": 1])
        XCTAssertEqual(Pricing.amount(sub, phases: phases, on: Day.parse("2026-02-28")!, rates: rates, currency: "usd"), 5)
        XCTAssertEqual(Pricing.amount(sub, phases: phases, on: Day.parse("2026-03-31")!, rates: rates, currency: "usd"), 5)
        XCTAssertEqual(Pricing.amount(sub, phases: phases, on: Day.parse("2026-04-30")!, rates: rates, currency: "usd"), 20)
    }

    func fixture() -> Subscription {
        Subscription(id: "s", name: "Test", cost: "20.00", currency: "usd", paymentDate: "2026-01-20T00:00:00Z", now: now)
    }
}
