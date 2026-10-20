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

    func testPendingChangeOutranksOpenEndedAppliedPhaseOnItsDay() throws {
        var sub = fixture(); sub.cost = "9.99"
        var phases = [try Pricing.scheduled(sub, cost: "14.99", currency: "usd", on: nil, now: Day.parse("2026-05-15T12:00:00Z")!, zone: .gmt, id: "raise")]
        try Pricing.settle(subscription: &sub, phases: &phases, now: Day.parse("2026-05-20T08:00:00Z")!)
        phases.append(try Pricing.scheduled(sub, cost: "11.99", currency: "usd", on: nil, now: now, zone: .gmt, id: "cut"))
        let rates = ExchangeRates(rates: ["usd": 1])
        func row(_ at: Date) throws -> SubscriptionRow {
            try XCTUnwrap(Projection.rows(StoreDocument(preferences: .init(currency: "usd"), subscriptions: [sub], phases: phases), rates: rates, now: at).first)
        }
        let pending = try row(now)
        XCTAssertEqual(pending.nextDate.map(Day.key), "2026-09-20")
        XCTAssertEqual(pending.nextAmount, 11.99)
        XCTAssertEqual(Projection.payments([pending], from: Day.parse("2026-08-01")!, through: Day.parse("2026-10-31")!,
                                           rates: rates, currency: "usd").map(\.amount), [14.99, 11.99, 11.99])
        // Settling later that day closes the old phase at the instant, not at the day the new one starts.
        let settledAt = Day.parse("2026-09-20T09:00:00Z")!
        try Pricing.settle(subscription: &sub, phases: &phases, now: settledAt)
        let settled = try row(settledAt)
        XCTAssertEqual(settled.nextAmount, 11.99)
        XCTAssertEqual(Projection.payments([settled], from: Day.parse("2026-09-20")!, through: Day.parse("2026-09-20")!,
                                           rates: rates, currency: "usd").map(\.amount), [11.99])
    }

    func testDeferredOfferOutranksOpenEndedAppliedPhase() throws {
        var sub = fixture()
        var phases = [PricePhase(id: "old", subscriptionId: sub.id, kind: .standard, cost: "20.00", currency: "usd",
                                 startsAt: "2026-03-20T00:00:00Z", appliedAt: "2026-03-20T00:00:00Z", now: now)]
        phases += try Pricing.offer(subscription: &sub, promoCost: "5.00", standardCost: "25.00", currency: "usd", payments: 2,
                                    endDate: nil, deferred: true, now: now, zone: .gmt, ids: ("offer", "revert"))
        let rates = ExchangeRates(rates: ["usd": 1])
        let row = try XCTUnwrap(Projection.rows(StoreDocument(preferences: .init(currency: "usd"), subscriptions: [sub], phases: phases),
                                                rates: rates, now: now).first)
        XCTAssertEqual(row.nextAmount, 5)
        XCTAssertEqual(Projection.payments([row], from: Day.parse("2026-08-01")!, through: Day.parse("2026-11-30")!,
                                           rates: rates, currency: "usd").map(\.amount), [20, 5, 5, 25])
    }

    func testCounterpartMatchesBrandOrNameAndPrefersCurrentSubscription() {
        func row(_ id: String, _ name: String, _ domain: String?, _ status: SubscriptionStatus, updated: String) -> SubscriptionRow {
            var sub = fixture(); sub.id = id; sub.name = name; sub.brandDomain = domain; sub.updatedAt = updated
            return SubscriptionRow(subscription: sub, category: nil, status: status, amount: 20, monthly: 20, nextDate: nil, nextAmount: nil,
                                   effectiveKind: .standard, upcoming: nil, phases: [])
        }
        let ended = row("ended", "Claude Pro", "claude.ai", .cancelled, updated: "2026-03-01T00:00:00Z")
        let paused = row("paused", "Netflix", nil, .paused, updated: "2026-05-01T00:00:00Z")
        XCTAssertEqual(Lifecycle.counterpart(name: "Claude Max 5x", domain: "Claude.ai", in: [paused, ended])?.id, "ended")
        XCTAssertEqual(Lifecycle.counterpart(name: " netflix ", domain: "netflix.com", in: [paused, ended])?.id, "paused")
        XCTAssertNil(Lifecycle.counterpart(name: "Spotify", domain: "spotify.com", in: [paused, ended]))
        XCTAssertNil(Lifecycle.counterpart(name: "", domain: nil, in: [row("blank", "", nil, .paused, updated: "2026-05-01T00:00:00Z")]))
        let older = row("older", "Claude", "claude.ai", .cancelled, updated: "2025-01-01T00:00:00Z")
        let current = row("current", "Claude Team", "claude.ai", .active, updated: "2024-01-01T00:00:00Z")
        XCTAssertEqual(Lifecycle.counterpart(name: "Claude", domain: "claude.ai", in: [older, ended])?.id, "ended")
        XCTAssertEqual(Lifecycle.counterpart(name: "Claude", domain: "claude.ai", in: [ended, current, older])?.id, "current")
    }

    func testYearlyChangeCountsAnIntroEndingAndSkipsOffersAndCurrencySwitches() throws {
        func phase(_ kind: PhaseKind, _ cost: String, _ currency: String = "usd") -> PricePhase {
            PricePhase(id: kind.rawValue, subscriptionId: "s", kind: kind, cost: cost, currency: currency, startsAt: "2026-10-20T00:00:00Z", now: now)
        }
        var sub = fixture(); sub.cost = "4.99"
        XCTAssertEqual(try XCTUnwrap(Pricing.yearlyChange(sub, to: phase(.standard, "11.99"))), 84, accuracy: 0.001)
        sub.cost = "11.99"
        XCTAssertEqual(try XCTUnwrap(Pricing.yearlyChange(sub, to: phase(.scheduledChange, "15.00"))), 36.12, accuracy: 0.001)
        sub.cost = "14.99"
        XCTAssertEqual(try XCTUnwrap(Pricing.yearlyChange(sub, to: phase(.scheduledChange, "11.99"))), -36, accuracy: 0.001)
        sub.period = .year
        XCTAssertEqual(try XCTUnwrap(Pricing.yearlyChange(sub, to: phase(.scheduledChange, "11.99"))), -3, accuracy: 0.001)
        XCTAssertNil(Pricing.yearlyChange(sub, to: phase(.scheduledChange, "13.50", "eur")))
        XCTAssertNil(Pricing.yearlyChange(sub, to: phase(.trial, "0")))
        XCTAssertNil(Pricing.yearlyChange(sub, to: phase(.scheduledChange, "14.99")))
    }

    func testYearlyChangeAcrossACurrencySwitchComparesConvertedPrices() throws {
        let rates = ExchangeRates(rates: ["usd": 1, "uah": 40, "eur": 0.8])
        func phase(_ cost: String, _ currency: String) -> PricePhase {
            PricePhase(id: "p", subscriptionId: "s", kind: .scheduledChange, cost: cost, currency: currency, startsAt: "2026-10-20T00:00:00Z", now: now)
        }
        var sub = fixture(); sub.cost = "11.99"
        // $11.99 is ₴479.60 and €13.50 is ₴675.00: ₴195.40 more a month.
        XCTAssertEqual(try XCTUnwrap(Pricing.yearlyChange(sub, to: phase("13.50", "eur"), rates: rates, currency: "uah")), 2344.8, accuracy: 0.001)
        // €10 is $12.50, so the smaller number still costs $0.51 more a month.
        XCTAssertEqual(try XCTUnwrap(Pricing.yearlyChange(sub, to: phase("10.00", "eur"), rates: rates, currency: "usd")), 6.12, accuracy: 0.001)
        XCTAssertEqual(try XCTUnwrap(Pricing.yearlyChange(sub, to: phase("9.00", "eur"), rates: rates, currency: "usd")), -8.88, accuracy: 0.001)
        XCTAssertNil(Pricing.yearlyChange(sub, to: phase("9.592", "eur"), rates: rates, currency: "usd"))
        // €13.50 at 0.89 is $15.1685, shown as $15.17: the year is 12 × ($15.17 − $11.99), not 12 × $3.1785.
        let shown = ExchangeRates(rates: ["usd": 1, "eur": 0.89])
        XCTAssertEqual(try XCTUnwrap(Pricing.yearlyChange(sub, to: phase("13.50", "eur"), rates: shown, currency: "usd")), 38.16, accuracy: 0.001)
        XCTAssertNil(Pricing.yearlyChange(sub, to: phase("13.50", "gbp"), rates: rates, currency: "uah"))
        XCTAssertNil(rates.converted(10, from: "gbp", to: "usd"))
        XCTAssertEqual(rates.converted(10, from: "gbp", to: "GBP"), 10)
    }

    func fixture() -> Subscription {
        Subscription(id: "s", name: "Test", cost: "20.00", currency: "usd", paymentDate: "2026-01-20T00:00:00Z", now: now)
    }
}
