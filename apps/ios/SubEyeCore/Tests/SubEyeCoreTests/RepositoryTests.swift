import XCTest
@testable import SubEyeCore

@MainActor
final class RepositoryTests: XCTestCase {
    let now = Day.parse("2026-09-15T12:00:00Z")!

    func testInterruptedMigrationRollsBackAndResumesWithoutDuplicatingData() async throws {
        let store = repository()
        let doc = fixture()
        let raw = try JSONCodec.string(doc)
        let legacy = LegacySnapshot(pointer: "subeye.doc.b", slotA: "{torn", slotB: raw,
                                    values: ["flags:pro.entitled": "true"], fingerprint: "test", sourceExists: true)
        do { _ = try await store.migrate(legacy, now: now, failBeforeCommit: true); XCTFail("Expected rollback") }
        catch DomainError.invalidDocument { }
        let missing = try await store.migrationReceipt()
        XCTAssertNil(missing)
        let receipt = try await store.migrate(legacy, now: now)
        let repeated = try await store.migrate(legacy, now: now.addingTimeInterval(1))
        XCTAssertEqual(receipt, repeated)
        XCTAssertEqual(receipt.sourceSlot, "subeye.doc.b")
        let saved = try await store.document()
        XCTAssertEqual(saved, doc)
        let pro = try await store.setting("pro.entitled", as: Bool.self)
        XCTAssertEqual(pro, true)
    }

    func testTornActiveSlotFallsBackButFutureSchemaDoesNotRollbackToOldData() throws {
        let raw = try JSONCodec.string(fixture())
        let recovered = try LegacyMigration.select(LegacySnapshot(slotA: "bad", slotB: raw, sourceExists: true), defaults: .init())
        XCTAssertEqual(recovered.1, "subeye.doc.b")
        XCTAssertThrowsError(try LegacyMigration.select(LegacySnapshot(slotA: "{\"v\":99}", slotB: raw, sourceExists: true), defaults: .init()))
        XCTAssertThrowsError(try LegacyMigration.select(LegacySnapshot(slotA: "bad", slotB: "bad", sourceExists: true), defaults: .init()))
    }

    func testCurrentAndOlderFixturesMigrateWithoutDependingOnRecordOrder() async throws {
        for filename in ["legacy-current-v1", "legacy-older"] {
            let url = try XCTUnwrap(Bundle.module.url(forResource: filename, withExtension: "json", subdirectory: "Fixtures"))
            let bytes = try Data(contentsOf: url)
            let expected = try LegacyMigration.decode(bytes)
            let store = repository()
            _ = try await store.migrate(.init(slotA: String(decoding: bytes, as: UTF8.self), sourceExists: true), now: now)
            let actual = try await store.document()
            XCTAssertEqual(try CloudRecords.entries(actual), try CloudRecords.entries(expected))
            XCTAssertEqual(actual.subscriptions.count, expected.subscriptions.count)
        }
    }

    func testOlderDocumentDefaultsPreserveAllRecords() throws {
        let raw = try JSONCodec.encode(fixture())
        var doc = try JSONSerialization.jsonObject(with: raw) as! [String: Any]
        doc.removeValue(forKey: "v"); doc.removeValue(forKey: "preferences"); doc.removeValue(forKey: "phases")
        var subs = doc["subscriptions"] as! [[String: Any]]
        subs[0].removeValue(forKey: "autoPaid"); subs[0].removeValue(forKey: "status")
        doc["subscriptions"] = subs
        let result = try LegacyMigration.decode(JSONSerialization.data(withJSONObject: doc), defaults: .init(currency: "eur", timezone: "Europe/Kyiv"))
        XCTAssertEqual(result.subscriptions.count, 1)
        XCTAssertTrue(result.subscriptions[0].autoPaid)
        XCTAssertEqual(result.preferences.preferredCurrency, "eur")
        XCTAssertEqual(result.phases.count, 0)
    }

    func testTwoConnectionsRejectStaleEditsAndRetainBothIndependentWrites() async throws {
        let first = repository()
        _ = try await first.migrate(.init(slotA: try JSONCodec.string(fixture()), sourceExists: true), now: now)
        let second = SubscriptionRepository(url: first.url)
        let original = fixture().subscriptions[0]
        var edited = original; edited.name = "Edited"
        try await first.save(edited, expected: original, now: now)
        var stale = original; stale.cost = "999.00"
        do { try await second.save(stale, expected: original, now: now); XCTFail("Lost update") }
        catch DomainError.conflict { }
        let other = Subscription(id: "other", name: "Other", cost: "3.00", currency: "usd", paymentDate: original.paymentDate, now: now)
        try await second.save(other, expected: nil, now: now)
        let saved = try await first.document()
        XCTAssertEqual(saved.subscriptions.count, 2)
        XCTAssertEqual(saved.subscriptions.first(where: { $0.id == original.id })?.name, "Edited")
    }

    func testCloudUnionKeepsOfflineRowsAndChangedDeletionOnlyDeletesNamedRow() async throws {
        let store = repository()
        _ = try await store.migrate(.init(slotA: try JSONCodec.string(fixture()), sourceExists: true), now: now)
        let other = Subscription(id: "remote", name: "Remote", cost: "3.00", currency: "usd", paymentDate: "2026-01-01T00:00:00Z", now: now)
        try await store.mergeCloud(["sub.remote": try JSONCodec.string(other)], initialLink: true)
        var saved = try await store.document()
        XCTAssertEqual(saved.subscriptions.count, 2)
        try await store.mergeCloud(["sub.remote": nil, "sub.s": "invalid JSON", "foreign": nil])
        saved = try await store.document()
        XCTAssertEqual(saved.subscriptions.map(\.id), ["s"])
    }

    func testListNeverSettlesPhasesAndDetailSettlesTransactionally() async throws {
        let store = repository()
        var doc = fixture()
        doc.phases = [PricePhase(id: "phase", subscriptionId: "s", kind: .scheduledChange, cost: "50.00", currency: "usd", startsAt: "2026-09-01T00:00:00Z", now: now)]
        _ = try await store.migrate(.init(slotA: try JSONCodec.string(doc), sourceExists: true), now: now)
        _ = try await store.presentation(rates: .init(rates: ["usd": 1]), now: now)
        let before = try await store.document()
        XCTAssertEqual(before.subscriptions[0].cost, "20.00")
        XCTAssertNil(before.phases[0].appliedAt)
        try await store.settleDetail(id: "s", now: now)
        let after = try await store.document()
        XCTAssertEqual(after.subscriptions[0].cost, "50.00")
        XCTAssertNotNil(after.phases[0].appliedAt)
    }

    func testEraseCannotResurrectRetainedLegacyDocument() async throws {
        let store = repository()
        let legacy = LegacySnapshot(slotA: try JSONCodec.string(fixture()), sourceExists: true)
        _ = try await store.migrate(legacy, now: now)
        try await store.erase()
        _ = try await store.migrate(legacy, now: now)
        let saved = try await store.document()
        let archive = try await store.legacyValues(prefix: "")
        XCTAssertTrue(saved.subscriptions.isEmpty)
        XCTAssertTrue(archive.isEmpty)
    }

    func testKeepAcknowledgesWithoutChangingSubscriptionAndRequiresOptIn() async throws {
        let store = repository()
        _ = try await store.migrate(.init(slotA: try JSONCodec.string(fixture()), sourceExists: true), now: now)
        try await store.acknowledgeRenewal(day: "2026-09-15", now: now)
        let disabled = try await store.setting("live.ack.2026-09-15", as: String.self)
        XCTAssertNil(disabled)
        try await store.setSetting("live.enabled", value: true)
        try await store.acknowledgeRenewal(day: "2026-09-15", now: now)
        let enabled = try await store.setting("live.ack.2026-09-15", as: String.self)
        let saved = try await store.document()
        XCTAssertNotNil(enabled)
        XCTAssertEqual(saved, fixture())
    }

    func testOfflineEraseQueuesCloudTombstonesAndPreservesReviewCooldown() async throws {
        let store = repository()
        _ = try await store.migrate(.init(slotA: try JSONCodec.string(fixture()), sourceExists: true), now: now)
        try await store.setSetting("review.state", value: ["firstSeenAt": 1.0, "askedAt": 2.0])
        try await store.erase(additionalCloudKeys: ["sub.remote", "foreign"])
        let writes = try await store.pendingCloudWrites()
        XCTAssertTrue(writes.contains { $0.key == "sub.s" && $0.value == nil })
        XCTAssertTrue(writes.contains { $0.key == "sub.remote" && $0.value == nil })
        XCTAssertFalse(writes.contains { $0.key == "foreign" })
        try await store.mergeCloud(["sub.s": try JSONCodec.string(fixture().subscriptions[0])])
        let document = try await store.document()
        let review = try await store.setting("review.state", as: [String: Double].self)
        XCTAssertTrue(document.subscriptions.isEmpty)
        XCTAssertEqual(review?["askedAt"], 2)
    }

    private func repository() -> SubscriptionRepository {
        SubscriptionRepository(url: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString).appendingPathComponent("store.sqlite"))
    }
    private func fixture() -> StoreDocument {
        StoreDocument(preferences: .init(currency: "usd"), subscriptions: [
            Subscription(id: "s", name: "Test", cost: "20.00", currency: "usd", paymentDate: "2026-01-20T00:00:00Z", now: now)
        ])
    }
}
