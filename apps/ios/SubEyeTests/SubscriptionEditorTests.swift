import XCTest
import SubEyeCore
@testable import SubEye

@MainActor
final class SubscriptionEditorTests: XCTestCase {
    private let now = Day.parse("2026-11-04T10:00:00.000Z")!
    private let today = Day.parse("2026-11-04")!

    private func draft(_ cost: String, period: BillingPeriod = .month) -> Subscription {
        Subscription(id: "sub", name: " Netflix ", cost: cost, currency: "usd", period: period, paymentDate: Day.iso(today), now: now)
    }

    private func store(_ draft: Subscription, firstPayment: Date, offer: SubscriptionEditor.Offer) async throws -> StoreDocument {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let repository = SubscriptionRepository(url: directory.appendingPathComponent("test.sqlite"))
        _ = try await repository.migrate(LegacySnapshot(slotA: JSONCodec.string(StoreDocument(preferences: .init(currency: "usd")))), now: now)
        let (value, input) = try SubscriptionEditor.value(draft, firstPayment: firstPayment, offer: offer, now: now, zone: .gmt)
        try await repository.save(value, expected: nil, offer: input, rates: ExchangeRates(), now: now)
        return try await repository.document()
    }

    private func phases(_ document: StoreDocument) -> [PricePhase] {
        document.phases.sorted { (Day.parse($0.startsAt) ?? .distantPast) < (Day.parse($1.startsAt) ?? .distantPast) }
    }

    func testRegularSubscriptionStoresNoPhases() async throws {
        let document = try await store(draft("12.99"), firstPayment: Day.parse("2026-11-15T13:30:00.000Z")!, offer: .none)
        let subscription = try XCTUnwrap(document.subscriptions.first)
        XCTAssertEqual(subscription.name, "Netflix")
        XCTAssertEqual(subscription.cost, "12.99")
        XCTAssertEqual(subscription.paymentDate, Day.iso(Day.parse("2026-11-15")!), "The first payment is stored as its UTC day")
        XCTAssertTrue(document.phases.isEmpty)
    }

    func testIntroStartsAtTheOfferPriceUntilItsEnd() async throws {
        let end = Day.parse("2027-02-04")!
        let document = try await store(draft("11.99"), firstPayment: today, offer: .intro(price: "4.99", ends: Day.parse("2027-02-04T15:00:00.000Z")!))
        let subscription = try XCTUnwrap(document.subscriptions.first)
        XCTAssertEqual(subscription.cost, "4.99")
        XCTAssertEqual(subscription.paymentDate, Day.iso(today))
        let stored = phases(document)
        XCTAssertEqual(stored.map(\.kind), [.intro, .standard])
        XCTAssertEqual(stored.map(\.cost), ["4.99", "11.99"])
        XCTAssertEqual(stored[0].startsAt, Day.iso(now)); XCTAssertEqual(stored[0].endsAt, Day.iso(end)); XCTAssertEqual(stored[0].appliedAt, Day.iso(now))
        XCTAssertEqual(stored[1].startsAt, Day.iso(end)); XCTAssertNil(stored[1].appliedAt)
    }

    func testIntroMustStartLower() async throws {
        func rejection(_ promo: String, first: String = "2026-11-04", ends: String, now: Date? = nil, zone: TimeZone = .gmt) -> String? {
            SubscriptionEditor.rejection(draft("11.99"), firstPayment: Day.parse(first)!, offer: .intro(price: promo, ends: Day.parse(ends)!),
                                         now: now ?? self.now, zone: zone)
        }
        XCTAssertEqual(rejection("0", ends: "2026-12-04"), "form_introFree", "A free start is a trial, not an intro")
        XCTAssertEqual(rejection("11.99", ends: "2026-12-04"), "form_introTooHigh")
        XCTAssertEqual(rejection("15", ends: "2026-12-04"), "form_introTooHigh")
        XCTAssertEqual(rejection("4.99", ends: "2026-11-04"), "form_introEndEarly", "An end on the first payment day discounts nothing")
        XCTAssertNil(rejection("4.99", ends: "2026-11-05"))
        XCTAssertEqual(rejection("4.99", first: "2026-10-20", ends: "2026-11-15"), "form_introEndEarly", "The next charge, the 20th, is after the end")
        XCTAssertNil(rejection("4.99", first: "2026-10-20", ends: "2026-11-21"))
        let lateUTC = Day.parse("2026-11-04T23:30:00.000Z")!
        XCTAssertNil(rejection("4.99", first: "2026-10-04", ends: "2026-11-10", now: lateUTC, zone: .gmt))
        XCTAssertEqual(rejection("4.99", first: "2026-10-04", ends: "2026-11-10", now: lateUTC, zone: TimeZone(identifier: "Europe/Kyiv")!),
                       "form_introEndEarly", "Today is the preferred zone's: in Kyiv it is already the 5th, so the next charge is in December")
        let lateInLosAngeles = Day.parse("2026-11-05T03:00:00.000Z")!
        XCTAssertEqual(rejection("4.99", ends: "2026-11-05", now: lateInLosAngeles, zone: TimeZone(identifier: "America/Los_Angeles")!), "form_endTooSoon")
        let document = try await store(draft("11.99"), firstPayment: today, offer: .intro(price: "4.99", ends: Day.parse("2026-11-05")!))
        XCTAssertEqual(phases(document).map(\.kind), [.intro, .standard])
    }

    func testPreviewShowsTheFirstFullPriceCharge() {
        let first = Day.parse("2026-11-15")!
        let intro = SubscriptionEditor.plan(draft("11.99"), firstPayment: first, offer: .intro(price: "4.99", ends: Day.parse("2026-12-01")!))
        XCTAssertEqual(intro.map { $0.date }, [first, Day.parse("2026-12-15")!], "The full price starts with the first charge after the intro ends")
        XCTAssertEqual(intro.map { $0.amount }, ["$4.99", "$11.99"])
        let trial = SubscriptionEditor.plan(draft("11.99"), firstPayment: today, offer: .trial(ends: Day.parse("2026-11-11")!))
        XCTAssertEqual(trial.map { $0.date }, [today, Day.parse("2026-11-11")!])
        let license = SubscriptionEditor.plan(draft("19", period: .year), firstPayment: today, offer: .license(price: "29"))
        XCTAssertEqual(license.map { $0.date }, [today, Day.parse("2027-11-04")!])
        XCTAssertEqual(license.map { $0.amount }, ["$29.00", "$19.00"])
    }

    func testTrialIsFreeUntilItsEndAndChargedThatDay() async throws {
        let end = Day.parse("2026-11-11")!
        let document = try await store(draft("11.99"), firstPayment: today, offer: .trial(ends: Day.parse("2026-11-11T15:00:00.000Z")!))
        let subscription = try XCTUnwrap(document.subscriptions.first)
        XCTAssertEqual(subscription.cost, "0.00")
        let stored = phases(document)
        XCTAssertEqual(stored.map(\.kind), [.trial, .standard])
        XCTAssertEqual(stored.map(\.cost), ["0.00", "11.99"])
        XCTAssertEqual(stored[0].endsAt, Day.iso(end)); XCTAssertEqual(stored[1].startsAt, Day.iso(end))
        XCTAssertEqual(subscription.paymentDate, stored[0].endsAt, "The trial's end is its first charge")
        let payments = Projection.payments(Projection.rows(document, rates: ExchangeRates(), now: now), from: today, through: Day.parse("2026-12-31")!,
                                           rates: ExchangeRates(), currency: "usd")
        XCTAssertEqual(payments.map(\.date), [end, Day.parse("2026-12-11")!], "Nothing is charged before the trial ends")
        XCTAssertEqual(payments.map(\.amount), [11.99, 11.99])
        XCTAssertEqual(SubscriptionEditor.rejection(draft("0"), firstPayment: today, offer: .trial(ends: end), now: now), "form_priceAboveZero")
        XCTAssertEqual(SubscriptionEditor.rejection(draft("11.99"), firstPayment: today, offer: .trial(ends: today), now: now), "form_endTooSoon")
        XCTAssertThrowsError(try SubscriptionEditor.value(draft("0"), firstPayment: today, offer: .trial(ends: end), now: now))
    }

    func testLicenseChargesThePurchaseOnceAndRenewsUpdates() async throws {
        let purchase = Day.parse("2025-05-04")!, end = Day.parse("2026-05-04")!
        let document = try await store(draft("19", period: .year), firstPayment: purchase, offer: .license(price: "29"))
        let subscription = try XCTUnwrap(document.subscriptions.first)
        XCTAssertEqual(subscription.cost, "19.00", "The subscription keeps the renewal; the license is paid once")
        XCTAssertEqual(subscription.paymentDate, Day.iso(purchase))
        let stored = phases(document)
        XCTAssertEqual(stored.map(\.kind), [.license, .standard])
        XCTAssertEqual(stored.map(\.cost), ["29.00", "19.00"])
        XCTAssertEqual(stored[0].startsAt, Day.iso(purchase)); XCTAssertEqual(stored[0].endsAt, Day.iso(end))
        XCTAssertEqual(stored[1].startsAt, Day.iso(end)); XCTAssertEqual(stored[1].appliedAt, Day.iso(now), "A window already over renews at save")
        XCTAssertEqual(SubscriptionEditor.rejection(draft("0", period: .year), firstPayment: purchase, offer: .license(price: "29"), now: now), "form_priceAboveZero")
        XCTAssertEqual(SubscriptionEditor.rejection(draft("19", period: .year), firstPayment: purchase, offer: .license(price: "0"), now: now), "form_priceAboveZero")
        XCTAssertThrowsError(try SubscriptionEditor.value(draft("0", period: .year), firstPayment: purchase, offer: .license(price: "29"), now: now))
    }

    func testLicenseBoughtTodayChargesItsPriceToday() async throws {
        let document = try await store(draft("19", period: .year), firstPayment: today, offer: .license(price: "29"))
        let stored = phases(document)
        XCTAssertEqual(stored.map(\.kind), [.license, .standard])
        XCTAssertNil(stored[1].appliedAt)
        let rows = Projection.rows(document, rates: ExchangeRates(), now: now)
        let payments = Projection.payments(rows, from: today, through: Day.parse("2027-11-04")!, rates: ExchangeRates(), currency: "usd")
        XCTAssertEqual(payments.map(\.date), [today, Day.parse("2027-11-04")!])
        XCTAssertEqual(payments.map(\.amount), [29, 19])
        XCTAssertEqual(payments.map(\.purchase), [true, nil])
    }
}
