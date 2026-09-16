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
            try await repository.save(subscription, expected: original, now: now)
        }
        let sameDayModel = try await repository.presentation(rates: .init(rates: ["usd": 1]), now: now)
        try await publisher.publish(sameDayModel, pro: true, logos: logos)
        let sameDay = try XCTUnwrap(WidgetSnapshot.read(group: group, key: "snapshot"))
        XCTAssertEqual(sameDay.alsoDue, L("widget_alsoDue", ["count": "3"]))
    }
}
