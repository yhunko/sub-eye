import Foundation

public struct LegacySnapshot: Sendable {
    public var pointer: String?
    public var slotA: String?
    public var slotB: String?
    public var values: [String: String]
    public var fingerprint: String
    public var sourceExists: Bool

    public init(pointer: String? = nil, slotA: String? = nil, slotB: String? = nil,
                values: [String: String] = [:], fingerprint: String = "new-install", sourceExists: Bool = false) {
        self.pointer = pointer; self.slotA = slotA; self.slotB = slotB
        self.values = values; self.fingerprint = fingerprint; self.sourceExists = sourceExists
    }
}

public struct MigrationReceipt: Codable, Equatable, Sendable {
    public var version: Int
    public var fingerprint: String
    public var sourceSlot: String?
    public var subscriptions: Int
    public var categories: Int
    public var phases: Int
    public var completedAt: String
}

public enum LegacyMigration {
    public static func select(_ input: LegacySnapshot, defaults: Preferences) throws -> (StoreDocument, String?) {
        let activeB = input.pointer == "subeye.doc.b"
        let slots = activeB ? [("subeye.doc.b", input.slotB), ("subeye.doc.a", input.slotA)]
                            : [("subeye.doc.a", input.slotA), ("subeye.doc.b", input.slotB)]
        for (name, raw) in slots {
            guard let raw else { continue }
            do { return (try decode(Data(raw.utf8), defaults: defaults), name) }
            catch DomainError.unsupportedVersion(let version) { throw DomainError.unsupportedVersion(version) }
            catch { continue }
        }
        if input.sourceExists && (input.slotA != nil || input.slotB != nil) {
            throw DomainError.invalidDocument("Neither legacy slot could be validated")
        }
        return (StoreDocument(preferences: defaults), nil)
    }

    public static func decode(_ data: Data, defaults: Preferences = .init()) throws -> StoreDocument {
        guard var root = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw DomainError.invalidDocument("Expected an object")
        }
        let version = root["v"] as? Int ?? 0
        guard version == 0 || version == 1 else { throw DomainError.unsupportedVersion(version) }
        root["v"] = 1
        var prefs = try JSONSerialization.jsonObject(with: JSONCodec.encode(defaults)) as! [String: Any]
        if let existing = root["preferences"] as? [String: Any] { prefs.merge(existing) { _, old in old } }
        root["preferences"] = prefs
        for key in ["categories", "subscriptions", "phases"] {
            if root[key] == nil { root[key] = [] as [[String: Any]] }
            guard var records = root[key] as? [[String: Any]] else { throw DomainError.invalidDocument(key) }
            for index in records.indices {
                if key == "subscriptions" {
                    if records[index]["status"] == nil { records[index]["status"] = "active" }
                    if records[index]["autoPaid"] == nil { records[index]["autoPaid"] = true }
                }
                if let currency = records[index]["currency"] as? String { records[index]["currency"] = currency.lowercased() }
            }
            root[key] = records
        }
        let doc = try JSONCodec.decode(StoreDocument.self, JSONSerialization.data(withJSONObject: root))
        try validate(doc)
        return doc
    }

    public static func validate(_ doc: StoreDocument) throws {
        guard doc.v == 1 else { throw DomainError.unsupportedVersion(doc.v) }
        try unique(doc.subscriptions.map(\.id)); try unique(doc.categories.map(\.id)); try unique(doc.phases.map(\.id))
        guard doc.preferences.preferredCurrency.count == 3,
              TimeZone(identifier: doc.preferences.preferredTimezone) != nil else { throw DomainError.invalidField("preferences") }
        for row in doc.subscriptions { try validate(row) }
        for row in doc.categories {
            guard !row.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  Day.parse(row.createdAt) != nil, Day.parse(row.updatedAt) != nil else { throw DomainError.invalidField("category") }
        }
        for row in doc.phases {
            guard !row.subscriptionId.isEmpty, Money.parse(row.cost) != nil,
                  row.currency.count == 3, Day.parse(row.startsAt) != nil,
                  Day.parse(row.createdAt) != nil, Day.parse(row.updatedAt) != nil else { throw DomainError.invalidField("phase") }
            for date in [row.endsAt, row.appliedAt].compactMap({ $0 }) {
                guard Day.parse(date) != nil else { throw DomainError.invalidField("phase.date") }
            }
        }
    }

    public static func validate(_ row: Subscription) throws {
        guard !row.id.isEmpty, !row.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              Money.parse(row.cost) != nil, row.currency.count == 3, row.every > 0, row.every <= 365,
              Day.parse(row.paymentDate) != nil, Day.parse(row.createdAt) != nil,
              Day.parse(row.updatedAt) != nil else { throw DomainError.invalidField("subscription") }
        for date in [row.willBeCancelledAt, row.pausedAt, row.resumeAt].compactMap({ $0 }) {
            guard Day.parse(date) != nil else { throw DomainError.invalidField("subscription.date") }
        }
    }

    private static func unique(_ ids: [String]) throws {
        guard ids.allSatisfy({ !$0.isEmpty }), Set(ids).count == ids.count else { throw DomainError.invalidDocument("Duplicate or empty id") }
    }
}

public enum CloudRecords {
    public static func owns(_ key: String) -> Bool {
        key == "prefs" || key.hasPrefix("sub.") || key.hasPrefix("cat.") || key.hasPrefix("phase.")
    }
    public static func entries(_ doc: StoreDocument) throws -> [String: String] {
        var entries = ["prefs": try JSONCodec.string(doc.preferences)]
        for row in doc.subscriptions { entries["sub." + row.id] = try JSONCodec.string(row) }
        for row in doc.categories { entries["cat." + row.id] = try JSONCodec.string(row) }
        for row in doc.phases { entries["phase." + row.id] = try JSONCodec.string(row) }
        return entries
    }

    public static func valid(_ key: String, value: String, defaults: Preferences) -> Bool {
        let data = Data(value.utf8)
        if key == "prefs" { return (try? JSONCodec.decode(Preferences.self, data)).map { $0.preferredCurrency.count == 3 && TimeZone(identifier: $0.preferredTimezone) != nil } ?? false }
        if key.hasPrefix("sub."), let row = try? JSONCodec.decode(Subscription.self, data), row.id == String(key.dropFirst(4)) {
            return (try? LegacyMigration.validate(row)) != nil
        }
        if key.hasPrefix("cat."), let row = try? JSONCodec.decode(Category.self, data), row.id == String(key.dropFirst(4)) {
            return (try? LegacyMigration.validate(StoreDocument(preferences: defaults, categories: [row]))) != nil
        }
        if key.hasPrefix("phase."), let row = try? JSONCodec.decode(PricePhase.self, data), row.id == String(key.dropFirst(6)) {
            return (try? LegacyMigration.validate(StoreDocument(preferences: defaults, phases: [row]))) != nil
        }
        return false
    }
}
