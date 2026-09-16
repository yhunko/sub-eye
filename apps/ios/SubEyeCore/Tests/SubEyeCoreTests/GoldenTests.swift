import XCTest
@testable import SubEyeCore

final class GoldenTests: XCTestCase {
    private struct Golden: Decodable {
        struct RecurrenceVector: Decodable { var anchor: String; var target: String; var every: Int; var period: BillingPeriod; var expected: String }
        struct Conversion: Decodable { var amount: Double; var from: String; var to: String; var expected: Double }
        struct Monthly: Decodable { var amount: Double; var every: Int; var period: BillingPeriod; var expected: Double }
        struct Status: Decodable { var willBeCancelledAt: String?; var pausedAt: String?; var resumeAt: String?; var now: String; var zone: String; var expected: SubscriptionStatus }
        struct Phase: Decodable { var id: String; var startsAt: String; var endsAt: String? }
        struct PricingVector: Decodable { var now: String; var phases: [Phase]; var effective: String?; var upcoming: String? }
        struct Pause: Decodable { var pausedAt: String?; var resumeAt: String?; var occurrence: String; var expected: Bool }
        var usd: [String: Double]
        var recurrence: [RecurrenceVector]
        var conversions: [Conversion]
        var monthly: [Monthly]
        var statuses: [Status]
        var pricing: [PricingVector]
        var pauses: [Pause]
    }
    func testSharedTypeScriptRecurrenceMoneyAndLifecycleVectors() throws {
        let url = try XCTUnwrap(Bundle.module.url(forResource: "golden-v1", withExtension: "json", subdirectory: "Fixtures"))
        let golden = try JSONCodec.decode(Golden.self, Data(contentsOf: url))
        for vector in golden.recurrence {
            let sub = Subscription(id: "golden", name: "Golden", cost: "1", currency: "usd", every: vector.every, period: vector.period, paymentDate: vector.anchor, now: Date())
            let next = try XCTUnwrap(Recurrence.next(sub, onOrAfter: Day.parse(vector.target)!))
            XCTAssertEqual(Day.key(next), vector.expected, "\(vector.anchor) \(vector.target)")
        }
        let rates = ExchangeRates(rates: golden.usd)
        for vector in golden.conversions { XCTAssertEqual(rates.convert(vector.amount, from: vector.from, to: vector.to), vector.expected, accuracy: 0.0000001) }
        for vector in golden.monthly { XCTAssertEqual(Money.monthly(vector.amount, every: vector.every, period: vector.period), vector.expected, accuracy: 0.0000001) }
        for vector in golden.statuses {
            var sub = Subscription(id: "golden", name: "Golden", cost: "1", currency: "usd", paymentDate: "2026-01-31", now: Date())
            sub.willBeCancelledAt = vector.willBeCancelledAt; sub.pausedAt = vector.pausedAt; sub.resumeAt = vector.resumeAt
            XCTAssertEqual(Lifecycle.status(sub, now: Day.parse(vector.now)!, zone: TimeZone(identifier: vector.zone)!), vector.expected, vector.zone)
        }
        for vector in golden.pricing {
            let now = try XCTUnwrap(Day.parse(vector.now))
            let phases = vector.phases.map { PricePhase(id: $0.id, subscriptionId: "golden", kind: .standard, cost: "1", currency: "usd", startsAt: $0.startsAt, endsAt: $0.endsAt, now: now) }
            XCTAssertEqual(Pricing.effective(phases, at: now)?.id, vector.effective, vector.now)
            XCTAssertEqual(Pricing.upcoming(phases, at: now)?.id, vector.upcoming, vector.now)
        }
        for vector in golden.pauses {
            var sub = Subscription(id: "golden", name: "Golden", cost: "1", currency: "usd", paymentDate: "2026-01-31", now: Date())
            sub.pausedAt = vector.pausedAt; sub.resumeAt = vector.resumeAt
            XCTAssertEqual(Lifecycle.isPaused(sub, occurrence: try XCTUnwrap(Day.parse(vector.occurrence))), vector.expected, vector.occurrence)
        }
    }
}
