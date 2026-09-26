import Foundation
import os

public enum Performance {
    public static let signposts = OSSignposter(subsystem: "cc.subeye.native", category: "Performance")
}

public struct OfferInput: Sendable {
    public var promoCost: String
    public var standardCost: String
    public var currency: String
    public var payments: Int?
    public var endDate: Date?
    public var deferred: Bool
    public init(promoCost: String, standardCost: String, currency: String, payments: Int? = nil,
                endDate: Date? = nil, deferred: Bool = false) {
        self.promoCost = promoCost; self.standardCost = standardCost; self.currency = currency
        self.payments = payments; self.endDate = endDate; self.deferred = deferred
    }
}

public struct CloudWrite: Sendable {
    public var key: String
    public var value: String?
    public var revision: Int64
}

public actor SubscriptionRepository {
    public nonisolated let url: URL
    private let defaults: Preferences
    private var connection: SQLiteConnection?
    private var emittedFirstModel = false

    public init(url: URL, defaults: Preferences = .init()) { self.url = url; self.defaults = defaults }

    private func db() throws -> SQLiteConnection {
        if let connection { return connection }
        let span = Performance.signposts.beginInterval("StoreOpen")
        defer { Performance.signposts.endInterval("StoreOpen", span) }
        let connection = try SQLiteConnection(url: url)
        self.connection = connection
        return connection
    }

    public func migrationReceipt() throws -> MigrationReceipt? {
        try setting("migration.v1", as: MigrationReceipt.self)
    }

    public func migrate(_ legacy: LegacySnapshot, now: Date, failBeforeCommit: Bool = false) throws -> MigrationReceipt {
        let database = try db()
        let span = Performance.signposts.beginInterval("Migration")
        defer { Performance.signposts.endInterval("Migration", span) }
        return try database.transaction {
            if let prior = try setting("migration.v1", as: MigrationReceipt.self) { return prior }
            guard try database.scalar("SELECT COUNT(*) FROM records") == "0" else { throw DomainError.conflict }
            let (document, slot) = try LegacyMigration.select(legacy, defaults: defaults)
            for (key, raw) in try CloudRecords.entries(document) {
                try database.execute("INSERT INTO records VALUES (?, ?)", [key, raw])
            }
            for (key, value) in legacy.values {
                try database.execute("INSERT OR REPLACE INTO legacy VALUES (?, ?)", [key, value])
                if key.hasPrefix("flags:"), key != "flags:dev.forcePro" {
                    try database.execute("INSERT OR REPLACE INTO metadata VALUES (?, ?)", [String(key.dropFirst(6)), value])
                }
            }
            if let raw = legacy.slotA { try database.execute("INSERT INTO legacy VALUES ('subeye.doc.a',?)", [raw]) }
            if let raw = legacy.slotB { try database.execute("INSERT INTO legacy VALUES ('subeye.doc.b',?)", [raw]) }
            let readback = try readDocument(database)
            try LegacyMigration.validate(readback)
            guard try CloudRecords.entries(readback) == CloudRecords.entries(document), try database.scalar("PRAGMA quick_check") == "ok" else {
                throw DomainError.invalidDocument("Native read-back validation failed")
            }
            if failBeforeCommit { throw DomainError.invalidDocument("Injected interruption") }
            let receipt = MigrationReceipt(version: 1, fingerprint: legacy.fingerprint, sourceSlot: slot,
                                           subscriptions: document.subscriptions.count, categories: document.categories.count,
                                           phases: document.phases.count, completedAt: Day.iso(now))
            try putSetting("migration.v1", value: receipt, database: database)
            try increment(database)
            return receipt
        }
    }

    public func document() throws -> StoreDocument {
        let database = try ready()
        return try database.transaction { try readDocument(database) }
    }

    public func presentation(rates: ExchangeRates, now: Date) throws -> Presentation {
        let database = try ready()
        let (document, revision) = try database.transaction {
            (try readDocument(database), try self.revision(database))
        }
        let span = Performance.signposts.beginInterval("ModelProjection")
        defer { Performance.signposts.endInterval("ModelProjection", span) }
        let model = Projection.presentation(document, rates: rates, now: now, revision: revision)
        if !emittedFirstModel { Performance.signposts.emitEvent("FirstModelAvailable"); emittedFirstModel = true }
        return model
    }

    public func calendar(from: Date, through: Date, rates: ExchangeRates, now: Date) throws -> [CalendarEvent] {
        let doc = try document()
        return Projection.events(Projection.rows(doc, rates: rates, now: now), from: from, through: through,
                                 rates: rates, currency: doc.preferences.preferredCurrency)
    }

    public func save(_ value: Subscription, expected: Subscription?, offer: OfferInput? = nil, now: Date) throws {
        try LegacyMigration.validate(value)
        let database = try ready()
        try database.transaction {
            let current = try record(Subscription.self, key: "sub." + value.id, database: database)
            guard current == expected else { throw DomainError.conflict }
            if let categoryId = value.categoryId,
               try database.scalar("SELECT key FROM records WHERE key=?", ["cat." + categoryId]) == nil {
                throw DomainError.invalidField("categoryId")
            }
            var next = value; next.updatedAt = Day.iso(now)
            next.status = Lifecycle.status(next, now: now, zone: try zone(database))
            var phases: [PricePhase]?
            if let offer {
                guard current == nil else { throw DomainError.illegalAction }
                phases = try Pricing.offer(subscription: &next, promoCost: offer.promoCost, standardCost: offer.standardCost,
                                          currency: offer.currency, payments: offer.payments, endDate: offer.endDate,
                                          deferred: offer.deferred, now: now, zone: try zone(database), ids: (UUID().uuidString, UUID().uuidString))
            }
            try write("sub." + next.id, next, database: database)
            if let phases { for phase in phases { try write("phase." + phase.id, phase, database: database) } }
        }
    }

    public func deleteSubscription(id: String) throws {
        let database = try ready()
        try database.transaction {
            for phase in try allPhases(database) where phase.subscriptionId == id {
                try remove("phase." + phase.id, database: database)
            }
            try remove("sub." + id, database: database)
        }
    }

    public func transition(id: String, action: LifecycleAction, day: Date? = nil, immediate: Bool = false, now: Date) throws {
        let database = try ready()
        try database.transaction {
            guard let sub = try record(Subscription.self, key: "sub." + id, database: database) else { throw DomainError.notFound }
            let next = try Lifecycle.change(sub, action: action, day: day, immediate: immediate, now: now, zone: try zone(database))
            try write("sub." + id, next, database: database)
        }
    }

    public func settleDetail(id: String, now: Date) throws {
        let database = try ready()
        try database.transaction {
            guard var sub = try record(Subscription.self, key: "sub." + id, database: database) else { throw DomainError.notFound }
            var phases = try allPhases(database).filter { $0.subscriptionId == id }
            let prior = sub, previousPhases = phases
            try Pricing.settle(subscription: &sub, phases: &phases, now: now)
            if sub != prior { try write("sub." + id, sub, database: database) }
            for phase in phases where !previousPhases.contains(phase) { try write("phase." + phase.id, phase, database: database) }
        }
    }

    public func schedulePrice(id: String, cost: String, currency: String, date: Date?, now: Date) throws {
        let database = try ready()
        try database.transaction {
            guard let sub = try record(Subscription.self, key: "sub." + id, database: database) else { throw DomainError.notFound }
            guard Lifecycle.status(sub, now: now, zone: try zone(database)) == .active else { throw DomainError.illegalAction }
            let phase = try Pricing.scheduled(sub, cost: cost, currency: currency, on: date, now: now, zone: try zone(database), id: UUID().uuidString)
            for old in try allPhases(database) where old.subscriptionId == id && old.appliedAt == nil {
                try remove("phase." + old.id, database: database)
            }
            try write("phase." + phase.id, phase, database: database)
        }
    }

    public func startOffer(id: String, offer: OfferInput, now: Date) throws {
        let database = try ready()
        try database.transaction {
            guard var sub = try record(Subscription.self, key: "sub." + id, database: database) else { throw DomainError.notFound }
            guard Lifecycle.status(sub, now: now, zone: try zone(database)) == .active else { throw DomainError.illegalAction }
            let phases = try Pricing.offer(subscription: &sub, promoCost: offer.promoCost, standardCost: offer.standardCost,
                                          currency: offer.currency, payments: offer.payments, endDate: offer.endDate, deferred: offer.deferred,
                                          now: now, zone: try zone(database), ids: (UUID().uuidString, UUID().uuidString))
            for old in try allPhases(database) where old.subscriptionId == id { try remove("phase." + old.id, database: database) }
            for phase in phases { try write("phase." + phase.id, phase, database: database) }
            try write("sub." + id, sub, database: database)
        }
    }

    public func managePhase(subscriptionId: String, phaseId: String, apply: Bool, now: Date) throws {
        let database = try ready()
        try database.transaction {
            guard var sub = try record(Subscription.self, key: "sub." + subscriptionId, database: database) else { throw DomainError.notFound }
            var phases = try allPhases(database).filter { $0.subscriptionId == subscriptionId }
            guard let target = phases.first(where: { $0.id == phaseId }), target.appliedAt == nil else { throw DomainError.illegalAction }
            if apply {
                try Pricing.apply(phaseId, subscription: &sub, phases: &phases, now: now)
                try write("sub." + subscriptionId, sub, database: database)
                for phase in phases { try write("phase." + phase.id, phase, database: database) }
            } else {
                try remove("phase." + phaseId, database: database)
                // A deferred offer and its revert form one plan; dropping only
                // the first would still change the price later without an offer.
                if target.kind == .trial || target.kind == .intro {
                    for phase in phases where phase.appliedAt == nil && phase.kind == .standard {
                        try remove("phase." + phase.id, database: database)
                    }
                }
            }
        }
    }

    public func saveCategory(_ category: Category, expected: Category?) throws {
        try LegacyMigration.validate(StoreDocument(preferences: defaults, categories: [category]))
        let database = try ready()
        try database.transaction {
            guard try record(Category.self, key: "cat." + category.id, database: database) == expected else { throw DomainError.conflict }
            try write("cat." + category.id, category, database: database)
        }
    }

    public func deleteCategory(id: String, now: Date) throws {
        let database = try ready()
        try database.transaction {
            for var sub in try readDocument(database).subscriptions where sub.categoryId == id {
                sub.categoryId = nil; sub.updatedAt = Day.iso(now)
                try write("sub." + sub.id, sub, database: database)
            }
            try remove("cat." + id, database: database)
        }
    }

    public func savePreferences(_ preferences: Preferences) throws {
        try LegacyMigration.validate(StoreDocument(preferences: preferences))
        let database = try ready()
        try database.transaction { try write("prefs", preferences, database: database) }
    }

    public func setting<T: Decodable & Sendable>(_ key: String, as type: T.Type) throws -> T? {
        guard let raw = try db().scalar("SELECT value FROM metadata WHERE key=?", [key]) else { return nil }
        return try? JSONCodec.decode(T.self, Data(raw.utf8))
    }

    public func setSetting<T: Codable & Sendable>(_ key: String, value: T) throws {
        let database = try db()
        try database.transaction { try putSetting(key, value: value, database: database); try increment(database) }
    }

    public func legacyValues(prefix: String) throws -> [String: String] {
        try Dictionary(uniqueKeysWithValues: db().rows("SELECT key,value FROM legacy WHERE key LIKE ?", [prefix + "%"]).compactMap { row in
            guard let key = row[0], let value = row[1] else { return nil }; return (key, value)
        })
    }

    public func exportArchive() throws -> Data { try JSONCodec.encode(document()) }

    public func importArchive(_ data: Data) throws {
        let document = try LegacyMigration.decode(data, defaults: defaults)
        let database = try ready()
        try database.transaction {
            for (key, raw) in try CloudRecords.entries(document) {
                try writeRaw(key, raw: raw, database: database)
            }
        }
    }

    public func mergeCloud(_ changed: [String: String?], initialLink: Bool = false) throws {
        let database = try ready()
        try database.transaction {
            for (key, raw) in changed where CloudRecords.owns(key) {
                // Unsynced local edits are explicit writes. An unrelated cloud
                // notification must not erase them before they can be uploaded.
                if !initialLink, try database.scalar("SELECT key FROM outbox WHERE key=?", [key]) != nil { continue }
                if let raw {
                    guard CloudRecords.valid(key, value: raw, defaults: defaults) else { continue }
                    try database.execute("INSERT OR REPLACE INTO records VALUES (?,?)", [key, raw])
                } else if key != "prefs" {
                    try database.execute("DELETE FROM records WHERE key=?", [key])
                }
            }
            try increment(database)
        }
    }

    public func prepareCloudLink() throws -> [String: String] { try CloudRecords.entries(document()) }

    public func pendingCloudWrites() throws -> [CloudWrite] {
        try ready().rows("SELECT key,payload,revision FROM outbox ORDER BY revision").compactMap { row in
            guard let key = row[0], let revision = row[2].flatMap(Int64.init) else { return nil }
            return CloudWrite(key: key, value: row[1], revision: revision)
        }
    }

    public func acknowledgeCloud(_ writes: [CloudWrite]) throws {
        let database = try ready()
        try database.transaction {
            for write in writes { try database.execute("DELETE FROM outbox WHERE key=? AND revision=?", [write.key, String(write.revision)]) }
        }
    }

    public func acknowledgeRenewal(day: String, now: Date) throws {
        let database = try ready()
        try database.transaction {
            guard try setting("live.enabled", as: Bool.self) == true else { return }
            try putSetting("live.ack." + day, value: Day.iso(now), database: database)
            try increment(database)
        }
    }

    public func erase(additionalCloudKeys: [String] = []) throws {
        let database = try ready()
        try database.transaction {
            let keys = Set(try database.rows("SELECT key FROM records").compactMap { $0[0] }).union(additionalCloudKeys.filter(CloudRecords.owns))
            for key in keys { try remove(key, database: database) }
            try database.execute("DELETE FROM legacy")
            try database.execute("DELETE FROM metadata WHERE key NOT IN ('schema','revision','migration.v1','pro.entitled','cloud.sync','review.state')")
            try write("prefs", defaults, database: database)
            try putSetting("live.enabled", value: false, database: database)
            try putSetting("data.erased", value: true, database: database)
        }
        try database.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    }

    private func ready() throws -> SQLiteConnection {
        let database = try db()
        guard try database.scalar("SELECT value FROM metadata WHERE key='migration.v1'") != nil else { throw DomainError.migrationRequired }
        return database
    }

    private func readDocument(_ database: SQLiteConnection) throws -> StoreDocument {
        var doc = StoreDocument(preferences: defaults)
        for row in try database.rows("SELECT key,payload FROM records ORDER BY key") {
            guard let key = row[0], let payload = row[1] else { continue }
            let data = Data(payload.utf8)
            if key == "prefs" { doc.preferences = try JSONCodec.decode(Preferences.self, data) }
            else if key.hasPrefix("sub.") { doc.subscriptions.append(try JSONCodec.decode(Subscription.self, data)) }
            else if key.hasPrefix("cat.") { doc.categories.append(try JSONCodec.decode(Category.self, data)) }
            else if key.hasPrefix("phase.") { doc.phases.append(try JSONCodec.decode(PricePhase.self, data)) }
        }
        return doc
    }

    private func record<T: Decodable>(_ type: T.Type, key: String, database: SQLiteConnection) throws -> T? {
        guard let raw = try database.scalar("SELECT payload FROM records WHERE key=?", [key]) else { return nil }
        return try JSONCodec.decode(type, Data(raw.utf8))
    }
    private func allPhases(_ database: SQLiteConnection) throws -> [PricePhase] {
        try database.rows("SELECT payload FROM records WHERE key LIKE 'phase.%'").compactMap { row in
            guard let value = row[0] else { return nil }; return try JSONCodec.decode(PricePhase.self, Data(value.utf8))
        }
    }
    private func zone(_ database: SQLiteConnection) throws -> TimeZone {
        TimeZone(identifier: try record(Preferences.self, key: "prefs", database: database)?.preferredTimezone ?? defaults.preferredTimezone) ?? .gmt
    }
    private func revision(_ database: SQLiteConnection) throws -> Int64 {
        Int64(try database.scalar("SELECT value FROM metadata WHERE key='revision'") ?? "0") ?? 0
    }
    private func increment(_ database: SQLiteConnection) throws {
        try database.execute("UPDATE metadata SET value=CAST(value AS INTEGER)+1 WHERE key='revision'")
    }
    private func write<T: Encodable>(_ key: String, _ value: T, database: SQLiteConnection) throws {
        try writeRaw(key, raw: JSONCodec.string(value), database: database)
    }
    private func writeRaw(_ key: String, raw: String, database: SQLiteConnection) throws {
        guard try database.scalar("SELECT payload FROM records WHERE key=?", [key]) != raw else { return }
        try database.execute("INSERT OR REPLACE INTO records VALUES (?,?)", [key, raw])
        try increment(database)
        try database.execute("INSERT OR REPLACE INTO outbox VALUES (?,?,?)", [key, raw, String(try revision(database))])
    }
    private func remove(_ key: String, database: SQLiteConnection) throws {
        try database.execute("DELETE FROM records WHERE key=?", [key])
        try increment(database)
        try database.execute("INSERT OR REPLACE INTO outbox VALUES (?,NULL,?)", [key, String(try revision(database))])
    }
    private func putSetting<T: Encodable>(_ key: String, value: T, database: SQLiteConnection) throws {
        try database.execute("INSERT OR REPLACE INTO metadata VALUES (?,?)", [key, try JSONCodec.string(value)])
    }
}
