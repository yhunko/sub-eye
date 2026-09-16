import CryptoKit
import MMKV
import SubEyeCore
import XCTest
@testable import SubEye

@MainActor
final class MMKVMigrationTests: XCTestCase {
    func testBinaryMMKVReadCopiesFilesAndPreservesOriginalBytes() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let source = root.appendingPathComponent("mmkv")
        try FileManager.default.createDirectory(at: source, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        MMKV.initialize(rootDir: source.path, logLevel: .none)
        let now = Day.parse("2026-09-15T12:00:00Z")!
        let original = StoreDocument(preferences: .init(currency: "uah", timezone: "Europe/Kyiv"), subscriptions: [Subscription(id: "existing-українська", name: "Музика 🎵", cost: "199.99", currency: "uah", paymentDate: "2026-01-31T00:00:00.000Z", now: now)])
        let store = try XCTUnwrap(MMKV(mmapID: "subeye.store", rootPath: source.path))
        XCTAssertTrue(store.set("{interrupted", forKey: "subeye.doc.a"))
        XCTAssertTrue(store.set(try JSONCodec.string(original), forKey: "subeye.doc.b"))
        XCTAssertTrue(store.set("subeye.doc.b", forKey: "subeye.doc.active")); store.sync(); store.close()
        let flags = try XCTUnwrap(MMKV(mmapID: "mmkv.default", rootPath: source.path))
        XCTAssertTrue(flags.set(true, forKey: "pro.entitled")); XCTAssertTrue(flags.set(true, forKey: "dev.forcePro"))
        XCTAssertTrue(flags.set(#"{"renewals":true,"hour":8}"#, forKey: "notifications.settings")); flags.sync(); flags.close()
        let before = try files(source)
        try MMKVIntegrity.validate(data: Data(contentsOf: source.appendingPathComponent("subeye.store")), metadata: Data(contentsOf: source.appendingPathComponent("subeye.store.crc")))
        let reader = LegacyMMKVReader(source: source, staging: root.appendingPathComponent("copies"))
        let snapshot = try await reader.read()
        XCTAssertEqual(snapshot.pointer, "subeye.doc.b"); XCTAssertEqual(snapshot.values["flags:pro.entitled"], "true")
        XCTAssertNil(snapshot.values["flags:dev.forcePro"])
        XCTAssertEqual(try files(source), before)
        var corrupt = try Data(contentsOf: source.appendingPathComponent("subeye.store"))
        corrupt[10] ^= 1
        XCTAssertThrowsError(try MMKVIntegrity.validate(data: corrupt, metadata: Data(contentsOf: source.appendingPathComponent("subeye.store.crc"))))
        let repository = SubscriptionRepository(url: root.appendingPathComponent("native.sqlite"))
        let receipt = try await repository.migrate(snapshot, now: now)
        XCTAssertEqual(receipt.subscriptions, 1)
        let migrated = try await repository.document(); XCTAssertEqual(migrated, original)
        let repeated = try await repository.migrate(snapshot, now: now); XCTAssertEqual(receipt, repeated)
        XCTAssertEqual(try files(source), before)
    }
    func testBoundedLaunchCacheRejectsOversizedAndCorruptInput() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: url) }
        try Data(repeating: 32, count: LaunchCache.byteLimit + 20).write(to: url)
        XCTAssertNil(LaunchCache.read(at: url))
        try Data("{bad".utf8).write(to: url); XCTAssertNil(LaunchCache.read(at: url))
        let preview = Presentation(preferences: .init(currency: "eur"))
        try JSONCodec.encode(preview).write(to: url)
        XCTAssertEqual(LaunchCache.read(at: url), preview)
    }
    private func files(_ url: URL) throws -> [String: Data] {
        try Dictionary(uniqueKeysWithValues: FileManager.default.contentsOfDirectory(at: url, includingPropertiesForKeys: nil).filter { !$0.hasDirectoryPath }.map { ($0.lastPathComponent, Data(SHA256.hash(data: try Data(contentsOf: $0)))) })
    }
}
