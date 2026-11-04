import XCTest
import SubEyeCore
@testable import SubEye

@MainActor
final class WidgetTests: XCTestCase {
    func testDueTextUsesTimelineDayAndSnapshotLocale() throws {
        let now = try XCTUnwrap(Calendar.current.date(from: DateComponents(year: 2026, month: 9, day: 16, hour: 12)))
        let item = WidgetItem(id: "cloud", name: "Cloud", amount: "$2.99", date: "2026-09-17")
        XCTAssertEqual(item.dueText(locale: "en", now: now), "tomorrow")
        XCTAssertEqual(item.dueText(locale: "uk", now: now), "завтра")
        let nextDay = try XCTUnwrap(Calendar.current.date(byAdding: .day, value: 1, to: now))
        XCTAssertEqual(item.dueText(locale: "en", now: nextDay), "today")
    }

    func testActivityStateAcceptsExistingPayloadAndRestrictsLogoPaths() throws {
        let item = RenewalActivity.Item(id: "old", name: "Cloud storage", price: "$9.99")
        let original = RenewalActivity.ContentState(items: [item], count: 1, total: "$9.99", expiresAt: Date())
        var legacy = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONCodec.encode(original)) as? [String: Any])
        legacy.removeValue(forKey: "layoutVersion")
        let bytes = try JSONSerialization.data(withJSONObject: legacy)
        XCTAssertFalse(String(decoding: bytes, as: UTF8.self).contains("logoFile"))
        let decoded = try JSONCodec.decode(RenewalActivity.ContentState.self, bytes)
        XCTAssertEqual(decoded.items.first?.name, "Cloud storage")
        XCTAssertNil(decoded.items.first?.logoURL)
        XCTAssertNil(decoded.layoutVersion)
        XCTAssertNotEqual(decoded, original)
        var unsafe = item; unsafe.logoFile = "../../private.png"
        XCTAssertNil(unsafe.logoURL)
        var valid = item; valid.logoFile = String(repeating: "a", count: 64) + ".png"
        XCTAssertTrue(valid.logoURL?.path.hasSuffix("logos/live-activity/" + valid.logoFile!) == true)
    }

    func testLiveActivityDestinationsOpenSingleCancellationAndGroupedDay() throws {
        var single = URLComponents(url: AppConfiguration.url("subscriptions/demo-streaming"), resolvingAgainstBaseURL: false)!
        single.queryItems = [URLQueryItem(name: "action", value: "plan-cancellation")]
        let singleResult = try XCTUnwrap(DeepLink.route(try XCTUnwrap(single.url)))
        XCTAssertEqual(singleResult.tab, .subscriptions)
        XCTAssertNil(singleResult.route)
        XCTAssertNil(singleResult.segment, "A sheet over the current stack must not reset it")
        guard case .cancellation("demo-streaming")? = singleResult.sheet else {
            return XCTFail("Single cancellation must open the existing confirmation sheet")
        }

        let groupedResult = try XCTUnwrap(DeepLink.route(AppConfiguration.url("subscriptions/due/2026-09-29")))
        XCTAssertEqual(groupedResult.tab, .subscriptions)
        XCTAssertEqual(groupedResult.route, .due("2026-09-29"))
        XCTAssertNil(groupedResult.sheet)
        XCTAssertEqual(groupedResult.segment, .subscriptions)
    }

    func testInstallmentLinksOpenTheInstallmentsSegment() throws {
        let plan = try XCTUnwrap(DeepLink.route(AppConfiguration.url("installments/plan-phone")))
        XCTAssertEqual(plan.tab, .subscriptions)
        XCTAssertEqual(plan.route, .installment("plan-phone"))
        XCTAssertEqual(plan.segment, .installments)
        XCTAssertNil(plan.sheet)
        let digest = try XCTUnwrap(DeepLink.route(AppConfiguration.url("installments")))
        XCTAssertEqual(digest.tab, .subscriptions)
        XCTAssertNil(digest.route)
        XCTAssertEqual(digest.segment, .installments)
        XCTAssertEqual(DeepLink.route(AppConfiguration.url("subscriptions/demo-streaming"))?.segment, .subscriptions)
        XCTAssertEqual(NotificationService.destination(["plan-phone"], installments: true), AppConfiguration.url("installments/plan-phone"))
        XCTAssertEqual(NotificationService.destination(["plan-phone", "plan-sofa"], installments: true), AppConfiguration.url("installments"))
    }

    func testEffectiveSegmentFallsBackWithoutPlans() throws {
        var state = SceneState(presentation: Presentation())
        state.listSegment = .installments
        XCTAssertEqual(state.effectiveSegment, .subscriptions)
        state.presentation.installments = [Installments.row(plan("plan-phone", first: Day.today(), currency: "usd"), today: Day.today(), rates: .init(rates: ["usd": 1]), currency: "usd")]
        XCTAssertEqual(state.effectiveSegment, .installments)
    }

    func testWidgetItemWithoutInstallmentFieldsDecodes() throws {
        let item = try JSONCodec.decode(WidgetItem.self, Data(#"{"id":"cloud","name":"Cloud","amount":"$2.99","date":"2026-09-17","logoFile":null}"#.utf8))
        XCTAssertNil(item.link); XCTAssertNil(item.symbol); XCTAssertNil(item.tint)
        XCTAssertEqual(item.destination, AppConfiguration.url("subscriptions/cloud"))
    }

    func testLiveActivitiesSkipInstallmentPayments() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let repository = SubscriptionRepository(url: directory.appendingPathComponent("live.sqlite"))
        let now = Date(), today = Day.today(now, zone: .gmt)
        let subscription = Subscription(id: "cloud", name: "Cloud", cost: "10", currency: "usd", paymentDate: Day.iso(Day.shift(today, days: 1)), now: now)
        let document = StoreDocument(preferences: .init(currency: "usd", timezone: "UTC"), subscriptions: [subscription])
        _ = try await repository.migrate(LegacySnapshot(slotA: JSONCodec.string(document)), now: now)
        try await repository.saveInstallment(plan("plan-shared", first: Day.shift(today, days: 1), currency: "usd"), expected: nil, now: now)
        try await repository.saveInstallment(plan("plan-alone", first: Day.shift(today, days: 2), currency: "usd"), expected: nil, now: now)
        let events = try await repository.calendar(from: today, through: Day.shift(today, days: 3), rates: .init(rates: ["usd": 1]), now: now)
        XCTAssertEqual(Set(events.filter { $0.kind == .payment }.map { Day.key($0.date) }).count, 2, "The window holds a day with only a plan payment")
        let renewals = LiveActivityService.renewalEvents(events)
        XCTAssertEqual(renewals.map(\.subscriptionId), ["cloud"])
        XCTAssertEqual(Set(renewals.map { Day.key($0.date) }), [Day.key(Day.shift(today, days: 1))])
    }

    func testFreeSnapshotOmitsPrivateRenewalsAndProIncludesThem() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let repository = SubscriptionRepository(url: directory.appendingPathComponent("widget.sqlite"))
        let now = Date(), today = Day.today()
        let subscriptions = (0..<4).map { index in
            Subscription(id: "widget-test-\(index)", name: ["Cloud storage", "Music", "Creative tools", "News"][index], cost: String(10 + index), currency: "usd", paymentDate: Day.iso(Day.shift(today, days: index + 1)), now: now)
        }
        let document = StoreDocument(preferences: .init(currency: "usd", timezone: "Europe/Kyiv"), subscriptions: subscriptions)
        _ = try await repository.migrate(LegacySnapshot(slotA: JSONCodec.string(document)), now: now)
        let model = try await repository.presentation(rates: .init(rates: ["usd": 1]), now: now)
        let logos = LogoService(directory: directory.appendingPathComponent("logos"), repository: repository)
        let group = "WidgetTests." + UUID().uuidString
        defer { UserDefaults(suiteName: group)?.removePersistentDomain(forName: group) }
        let publisher = WidgetPublisher(group: group, key: "snapshot", logoDirectory: directory.appendingPathComponent("widget-logos"), reloadTimelines: false)
        try await publisher.publish(model, pro: false, logos: logos)
        let free = try XCTUnwrap(WidgetSnapshot.read(group: group, key: "snapshot"))
        XCTAssertTrue(free.locked); XCTAssertTrue(free.items.isEmpty); XCTAssertNil(free.delta); XCTAssertNil(free.alsoDue)
        try await publisher.publish(model, pro: true, logos: logos)
        let pro = try XCTUnwrap(WidgetSnapshot.read(group: group, key: "snapshot"))
        XCTAssertFalse(pro.locked); XCTAssertEqual(pro.items.count, 3); XCTAssertNil(pro.alsoDue)
        XCTAssertEqual(pro.items.map(\.id), Array(subscriptions.prefix(3).map(\.id)))
        XCTAssertTrue(pro.items.allSatisfy { !$0.amount.isEmpty && !$0.date.isEmpty })

        for original in subscriptions.dropFirst() {
            var subscription = original
            subscription.paymentDate = subscriptions[0].paymentDate
            try await repository.save(subscription, expected: original, rates: .init(rates: ["usd": 1]), now: now)
        }
        let sameDayModel = try await repository.presentation(rates: .init(rates: ["usd": 1]), now: now)
        try await publisher.publish(sameDayModel, pro: true, logos: logos)
        let sameDay = try XCTUnwrap(WidgetSnapshot.read(group: group, key: "snapshot"))
        XCTAssertEqual(sameDay.alsoDue, L("widget_alsoDue", ["count": "3"]))
    }

    func testProWidgetMergesConvertedPlanPaymentsAndFreeShowsNone() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let repository = SubscriptionRepository(url: directory.appendingPathComponent("widget.sqlite"))
        let now = Date(), today = Day.today()
        let rates = ExchangeRates(rates: ["usd": 1, "uah": 40])
        let subscriptions = [1, 3].map { day in
            Subscription(id: "renewal-\(day)", name: "Renewal \(day)", cost: "10", currency: "usd", paymentDate: Day.iso(Day.shift(today, days: day)), now: now)
        }
        let document = StoreDocument(preferences: .init(currency: "usd", timezone: TimeZone.current.identifier), subscriptions: subscriptions)
        _ = try await repository.migrate(LegacySnapshot(slotA: JSONCodec.string(document)), now: now)
        try await repository.saveInstallment(plan("plan-phone", first: Day.shift(today, days: 1), currency: "uah"), expected: nil, now: now)
        try await repository.saveInstallment(plan("plan-sofa", first: Day.shift(today, days: 2), currency: "uah"), expected: nil, now: now)
        var finished = plan("plan-done", first: Day.shift(today, days: -40), currency: "usd"); finished.paymentCount = 1; finished.total = "800.00"
        try await repository.saveInstallment(finished, expected: nil, now: now)
        let model = try await repository.presentation(rates: rates, now: now)
        let logos = LogoService(directory: directory.appendingPathComponent("logos"), repository: repository)
        let group = "WidgetTests." + UUID().uuidString
        defer { UserDefaults(suiteName: group)?.removePersistentDomain(forName: group) }
        let publisher = WidgetPublisher(group: group, key: "snapshot", logoDirectory: directory.appendingPathComponent("widget-logos"), reloadTimelines: false)

        try await publisher.publish(model, pro: false, logos: logos)
        let free = try XCTUnwrap(WidgetSnapshot.read(group: group, key: "snapshot"))
        XCTAssertTrue(free.items.isEmpty); XCTAssertNil(free.alsoDue)

        try await publisher.publish(model, pro: true, logos: logos)
        let pro = try XCTUnwrap(WidgetSnapshot.read(group: group, key: "snapshot"))
        XCTAssertEqual(Set(pro.items.prefix(2).map(\.id)), ["renewal-1", "plan-phone"])
        XCTAssertEqual(pro.items.last?.id, "plan-sofa", "A plan due before the next renewal takes its place in the list")
        XCTAssertEqual(pro.alsoDue, L("widget_alsoDue", ["count": "1"]), "A plan due on the first item's day counts as also due")
        let phone = try XCTUnwrap(pro.items.first { $0.id == "plan-phone" })
        XCTAssertEqual(phone.amount, Display.money(20, "usd"), "800 UAH at 40 per USD")
        XCTAssertEqual(phone.link, "installments/plan-phone")
        XCTAssertEqual(phone.destination, AppConfiguration.url("installments/plan-phone"))
        XCTAssertEqual(phone.symbol, "iphone"); XCTAssertEqual(phone.tint, "blue")
        XCTAssertNil(pro.items.first { $0.id == "renewal-1" }?.link)
    }

    private func plan(_ id: String, first: Date, currency: String) -> InstallmentPlan {
        InstallmentPlan(id: id, name: id, symbol: "iphone", tint: "blue", currency: currency, total: "4800.00", payment: "800.00",
                        paymentCount: 6, firstPaymentDate: Day.iso(first), now: Date())
    }
}
