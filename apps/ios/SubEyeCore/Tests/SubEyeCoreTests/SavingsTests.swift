import XCTest
@testable import SubEyeCore

@MainActor
final class SavingsTests: XCTestCase {
    let now = Day.parse("2026-09-15T12:00:00Z")!
    let usd = ExchangeRates(rates: ["usd": 1, "uah": 40, "eur": 0.8])

    func testEndedCountsEveryOccurrenceFromTheCancellationDayThroughToday() {
        let ended = sub(ended: "2026-06-20")
        let ledger = ledger([ended])
        XCTAssertEqual(ledger.total, 60, "Jun 20 is not charged on its cancellation day, so it is saved alongside Jul 20 and Aug 20")
        XCTAssertEqual(ledger.sinceEnded["s"], 60)
        XCTAssertEqual(ledger.stopped, 1)
        XCTAssertEqual(ledger.monthly, 20)
        XCTAssertEqual(self.ledger([ended], now: Day.parse("2026-09-20T08:00:00Z")!).total, 80, "An occurrence due today is already saved")
    }

    func testSkippedOccurrencesUseThePhaseThatWouldHaveAppliedThatDay() {
        var trial = sub(cost: "0.00", ended: "2026-06-20")
        trial.id = "trial"
        let phases = [
            phase("trial-0", trial.id, .trial, "0.00", from: "2026-06-01", to: "2026-07-20"),
            phase("trial-1", trial.id, .standard, "15.00", from: "2026-07-20")
        ]
        let ledger = ledger([trial], phases: phases)
        XCTAssertEqual(ledger.total, 30, "A trial cancelled before conversion saved the standard price of Jul 20 and Aug 20")
        XCTAssertEqual(ledger.monthly, 15, "The run-rate is what the trial would have become, not its zero price")

        var later = sub(ended: "2026-06-20")
        later.id = "later"
        let pending = [phase("later-0", later.id, .scheduledChange, "25.00", from: "2026-12-01")]
        XCTAssertEqual(self.ledger([later], phases: pending).monthly, 20, "A price change scheduled after the end never applied")
    }

    func testOccurrencesBeforeSubEyeKnewTheSubscriptionAreNotClaimed() {
        let late = sub(ended: "2026-03-20", created: "2026-08-01T09:00:00.000Z")
        XCTAssertEqual(ledger([late]).total, 20, "Only Aug 20 follows the day it was entered")

        let kyiv = TimeZone(identifier: "Europe/Kyiv")!
        let afterMidnight = sub(ended: "2026-03-20", created: "2026-08-19T21:30:00.000Z")
        XCTAssertEqual(Savings.skipped(afterMidnight, phases: [], through: Day.parse("2026-09-15")!, zone: kyiv, rates: usd, currency: "usd"), 20,
                       "Created on Aug 20 Kyiv time, so the Aug 20 occurrence counts")
        let nextDay = sub(ended: "2026-03-20", created: "2026-08-20T21:30:00.000Z")
        XCTAssertEqual(Savings.skipped(nextDay, phases: [], through: Day.parse("2026-09-15")!, zone: kyiv, rates: usd, currency: "usd"), 0,
                       "Created on Aug 21 Kyiv time even though the UTC date is still Aug 20")
    }

    func testPauseCountsOnlyOccurrencesItSkipped() {
        var open = sub(); open.id = "open"; open.pausedAt = "2026-07-20T12:00:00.000Z"
        var elapsed = sub(); elapsed.id = "elapsed"; elapsed.pausedAt = "2026-07-01T10:00:00.000Z"; elapsed.resumeAt = "2026-08-10T00:00:00.000Z"
        let ledger = ledger([open, elapsed])
        XCTAssertEqual(ledger.subscriptions["open"], 20, "Jul 20 was charged before the pause that afternoon")
        XCTAssertEqual(ledger.subscriptions["elapsed"], 20, "A pause that already ended still saved Jul 20")
        XCTAssertEqual(ledger.stopped, 0)
        XCTAssertEqual(ledger.monthly, 0)
    }

    func testCancellingSavesNothingYet() {
        let ledger = ledger([sub(ended: "2026-10-20")])
        XCTAssertEqual(ledger.total, 0)
        XCTAssertEqual(ledger.stopped, 0)
        XCTAssertTrue(ledger.subscriptions.isEmpty)
    }

    func testEverythingIsConvertedToThePreferredCurrency() {
        var hryvnia = sub(cost: "400.00", currency: "uah", ended: "2026-06-20")
        hryvnia.bankedSavings = "80.00"
        var yearly = sub(cost: "120.00", ended: "2026-01-20"); yearly.id = "yearly"; yearly.period = .year
        let ledger = ledger([hryvnia, yearly])
        XCTAssertEqual(ledger.subscriptions["s"]!, 32, accuracy: 0.000001, "1200 skipped plus 80 banked hryvnias at 40 per dollar")
        XCTAssertEqual(ledger.subscriptions["yearly"], 120)
        XCTAssertEqual(ledger.monthly, 20, accuracy: 0.000001, "400 UAH and 120 USD a year are 10 a month each")
    }

    func testTransitionsThatClearTheDatesBankWhatTheyErase() throws {
        let ended = sub(ended: "2026-06-20")
        var restarted = try change(ended, .restart, day: Day.parse("2026-09-15"))
        XCTAssertEqual(restarted.bankedSavings, "60.00")
        XCTAssertEqual(ledger([restarted]).total, 60, "The total must not drop when the dates it was derived from are cleared")

        restarted = try change(ended, .restart, day: Day.parse("2026-08-01"))
        XCTAssertEqual(restarted.bankedSavings, "40.00", "Paying again from Aug 1 means Aug 20 was not saved")

        var paused = sub(); paused.pausedAt = "2026-07-01T10:00:00.000Z"; paused.bankedSavings = "5.00"
        XCTAssertEqual(try change(paused, .resume).bankedSavings, "45.00", "Banking adds to an earlier balance")
        let onPaymentDay = Day.parse("2026-09-20T12:00:00Z")!
        XCTAssertEqual(try change(paused, .resume, now: onPaymentDay).bankedSavings, "45.00",
                       "Resuming on a payment day charges it, so Sep 20 is not banked")

        var cancelling = paused; cancelling.bankedSavings = nil; cancelling.willBeCancelledAt = "2026-10-20T00:00:00.000Z"
        XCTAssertEqual(try change(cancelling, .keep).bankedSavings, "40.00", "Keep clears the pause as well")

        var elapsed = sub(); elapsed.pausedAt = "2026-07-01T10:00:00.000Z"; elapsed.resumeAt = "2026-08-10T00:00:00.000Z"
        XCTAssertEqual(try change(elapsed, .pause).bankedSavings, "20.00", "A new pause overwrites the window that saved Jul 20")

        XCTAssertNil(try change(sub(), .cancel, immediate: true).bankedSavings, "Cancelling erases nothing")
    }

    func testBankingConvertsPhasePricesIntoTheSubscriptionCurrency() throws {
        let ended = sub(cost: "400.00", currency: "uah", ended: "2026-06-20")
        let phases = [phase("p", ended.id, .standard, "12.00", from: "2026-06-01", currency: "usd")]
        var next = try Lifecycle.change(ended, action: .restart, day: Day.parse("2026-09-15"), now: now, zone: .gmt)
        Savings.bank(&next, previous: ended, action: .restart, phases: phases, rates: usd, now: now, zone: .gmt)
        XCTAssertEqual(next.bankedSavings, "1440.00", "Three 12 USD occurrences banked as hryvnias, the subscription's own currency")
    }

    func testCurrencyChangesRebaseTheBankedBalance() {
        var next = sub(currency: "usd"); next.bankedSavings = "400.00"
        Savings.rebase(&next, from: "uah", rates: usd)
        XCTAssertEqual(next.bankedSavings, "10.00")
        var same = sub(); same.bankedSavings = "7.00"
        Savings.rebase(&same, from: "usd", rates: usd)
        XCTAssertEqual(same.bankedSavings, "7.00")
    }

    func testRepositoryBanksOnTransitionAndRebasesOnEditAndPhaseApplication() async throws {
        let store = SubscriptionRepository(url: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString).appendingPathComponent("store.sqlite"))
        let ended = sub(cost: "400.00", currency: "uah", ended: "2026-06-20")
        let doc = StoreDocument(preferences: .init(currency: "usd", timezone: "UTC"), subscriptions: [ended])
        _ = try await store.migrate(.init(slotA: try JSONCodec.string(doc), sourceExists: true), now: now)
        let before = try await store.presentation(rates: usd, now: now).dashboard.savings?.total
        XCTAssertEqual(before, 30)
        try await store.transition(id: "s", action: .restart, day: Day.parse("2026-09-15"), rates: usd, now: now)
        let after = try await store.presentation(rates: usd, now: now).dashboard.savings?.total
        XCTAssertEqual(after, 30)
        let writes = try await store.pendingCloudWrites()
        XCTAssertTrue(writes.contains { $0.key == "sub.s" && $0.value?.contains(#""bankedSavings":"1200.00""#) == true },
                      "The balance syncs inside the existing sub.<id> record")

        var edited = try await store.document().subscriptions[0]
        let original = edited
        edited.currency = "usd"; edited.cost = "10.00"
        try await store.save(edited, expected: original, rates: usd, now: now)
        let rebased = try await store.document().subscriptions[0]
        XCTAssertEqual(rebased.bankedSavings, "30.00")

        try await store.schedulePrice(id: "s", cost: "300.00", currency: "uah", date: Day.parse("2026-09-20"), now: now)
        let later = Day.parse("2026-09-21T12:00:00Z")!
        try await store.settleDetail(id: "s", rates: usd, now: later)
        let settled = try await store.document().subscriptions[0]
        XCTAssertEqual(settled.currency, "uah")
        XCTAssertEqual(settled.bankedSavings, "1200.00", "A price change into another currency must not reinterpret the balance")

        try await store.startOffer(id: "s", offer: OfferInput(promoCost: "5.00", standardCost: "10.00", currency: "usd",
                                                              endDate: Day.parse("2026-12-20")), rates: usd, now: later)
        let offered = try await store.document().subscriptions[0]
        XCTAssertEqual(offered.bankedSavings, "30.00")
        try await store.schedulePrice(id: "s", cost: "400.00", currency: "uah", date: Day.parse("2026-10-15"), now: later)
        let phases = try await store.document().phases
        let pending = try XCTUnwrap(phases.first { $0.appliedAt == nil })
        try await store.managePhase(subscriptionId: "s", phaseId: pending.id, apply: true, rates: usd, now: later)
        let applied = try await store.document().subscriptions[0]
        XCTAssertEqual(applied.bankedSavings, "1200.00")
    }

    func testRecordsWithoutTheFieldDecodeToNilAndKeepTheirExactBytes() throws {
        let raw = try JSONCodec.string(sub())
        XCTAssertFalse(raw.contains("bankedSavings"), "Re-encoding an old record must not add a key, or every record would look changed")
        XCTAssertNil(try JSONCodec.decode(Subscription.self, Data(raw.utf8)).bankedSavings)
        XCTAssertTrue(CloudRecords.valid("sub.s", value: raw, defaults: .init()))

        for name in ["legacy-current-v1", "legacy-older"] {
            let url = try XCTUnwrap(Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures"))
            let doc = try LegacyMigration.decode(Data(contentsOf: url))
            XCTAssertTrue(doc.subscriptions.allSatisfy { $0.bankedSavings == nil })
            XCTAssertFalse(try CloudRecords.entries(doc).values.contains { $0.contains("bankedSavings") })
        }

        var banked = sub(); banked.bankedSavings = "250000000.00"
        XCTAssertTrue(CloudRecords.valid("sub.s", value: try JSONCodec.string(banked), defaults: .init()),
                      "A large balance is still a valid record; rejecting it would drop the subscription from sync")
        for invalid in ["12.3oops", "-5.00", "1.234"] {
            banked.bankedSavings = invalid
            XCTAssertFalse(CloudRecords.valid("sub.s", value: try JSONCodec.string(banked), defaults: .init()), invalid)
        }
    }

    func testAnnualCostFollowsPhasesAndSkipsPausedOccurrences() {
        let from = Day.parse("2026-09-20")!
        XCTAssertEqual(Savings.annual(sub(), phases: [], from: from, rates: usd, currency: "usd"), 240)
        let trial = [phase("t0", "s", .trial, "0.00", from: "2026-09-01", to: "2026-10-20"), phase("t1", "s", .standard, "15.00", from: "2026-10-20")]
        XCTAssertEqual(Savings.annual(sub(cost: "0.00"), phases: trial, from: from, rates: usd, currency: "usd"), 165)
        var paused = sub(); paused.pausedAt = "2026-09-01T10:00:00.000Z"; paused.resumeAt = "2026-11-01T00:00:00.000Z"
        XCTAssertEqual(Savings.annual(paused, phases: [], from: from, rates: usd, currency: "usd"), 200)
    }

    func testYearlyEstimateCountsTheSameDayNextYearOnce() {
        func yearly(every: Int = 1, _ period: BillingPeriod, from paymentDate: String) -> Double {
            let sub = Subscription(id: "s", name: "Test", cost: "1.00", currency: "usd", every: every, period: period,
                                   paymentDate: paymentDate + "T00:00:00.000Z", now: now)
            let doc = StoreDocument(preferences: .init(currency: "usd", timezone: "UTC"), subscriptions: [sub])
            return Projection.presentation(doc, rates: usd, now: now, revision: 0).dashboard.yearly
        }
        XCTAssertEqual(yearly(.month, from: "2026-09-15"), 12)
        XCTAssertEqual(yearly(.year, from: "2026-09-15"), 1)
        XCTAssertEqual(yearly(.week, from: "2026-09-16"), 52)
        XCTAssertEqual(yearly(every: 2, .week, from: "2026-09-16"), 26)
    }

    func testProPriceComparisonSkipsAnUnconvertiblePrice() {
        let price = Decimal(string: "11.99")!
        XCTAssertTrue(Savings.coversPrice(480, price: price, priceCurrency: "USD", currency: "uah", rates: usd))
        XCTAssertFalse(Savings.coversPrice(479, price: price, priceCurrency: "USD", currency: "uah", rates: usd))
        XCTAssertTrue(Savings.coversPrice(11.99, price: price, priceCurrency: "pln", currency: "pln", rates: usd))
        XCTAssertFalse(Savings.coversPrice(479, price: price, priceCurrency: "xyz", currency: "uah", rates: usd),
                       "Converting through a missing rate returns the amount unchanged, which would read as 11.99 UAH")
        XCTAssertFalse(Savings.coversPrice(1000, price: price, priceCurrency: nil, currency: "uah", rates: usd))
    }

    private func sub(cost: String = "20.00", currency: String = "usd", ended: String? = nil,
                     created: String = "2026-01-01T00:00:00.000Z") -> Subscription {
        var value = Subscription(id: "s", name: "Test", cost: cost, currency: currency, paymentDate: "2026-01-20T00:00:00.000Z", now: now)
        value.createdAt = created
        value.willBeCancelledAt = ended.map { $0 + "T00:00:00.000Z" }
        return value
    }
    private func phase(_ id: String, _ subscription: String, _ kind: PhaseKind, _ cost: String, from: String, to: String? = nil,
                       currency: String = "usd") -> PricePhase {
        PricePhase(id: id, subscriptionId: subscription, kind: kind, cost: cost, currency: currency,
                   startsAt: from + "T00:00:00.000Z", endsAt: to.map { $0 + "T00:00:00.000Z" }, now: now)
    }
    private func ledger(_ subscriptions: [Subscription], phases: [PricePhase] = [], now: Date? = nil) -> SavingsLedger {
        let doc = StoreDocument(preferences: .init(currency: "usd", timezone: "UTC"), subscriptions: subscriptions, phases: phases)
        return Projection.presentation(doc, rates: usd, now: now ?? self.now, revision: 0).dashboard.savings!
    }
    private func change(_ previous: Subscription, _ action: LifecycleAction, day: Date? = nil, immediate: Bool = false,
                        now: Date? = nil) throws -> Subscription {
        let now = now ?? self.now
        var next = try Lifecycle.change(previous, action: action, day: day, immediate: immediate, now: now, zone: .gmt)
        Savings.bank(&next, previous: previous, action: action, phases: [], rates: usd, now: now, zone: .gmt)
        return next
    }
}
