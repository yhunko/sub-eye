import Foundation

public enum BillingPeriod: String, Codable, CaseIterable, Sendable {
    case day, week, month, year
}

public enum SubscriptionStatus: String, Codable, CaseIterable, Sendable {
    case active, cancelled, cancelling, paused
    public var isCurrent: Bool { self == .active || self == .cancelling }
}

public enum PhaseKind: String, Codable, CaseIterable, Sendable {
    case trial, intro, scheduledChange, standard
}

public struct Subscription: Codable, Identifiable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var cost: String
    public var currency: String
    public var every: Int
    public var period: BillingPeriod
    public var status: SubscriptionStatus
    public var autoPaid: Bool
    public var categoryId: String?
    public var notes: String?
    public var brandDomain: String?
    public var paymentDate: String
    public var willBeCancelledAt: String?
    public var pausedAt: String?
    public var resumeAt: String?
    public var createdAt: String
    public var updatedAt: String

    public init(id: String, name: String, cost: String, currency: String, every: Int = 1,
                period: BillingPeriod = .month, paymentDate: String, now: Date,
                categoryId: String? = nil, brandDomain: String? = nil) {
        self.id = id; self.name = name; self.cost = cost
        self.currency = currency.lowercased(); self.every = every; self.period = period
        self.paymentDate = paymentDate; self.categoryId = categoryId; self.brandDomain = brandDomain
        status = .active; autoPaid = true; createdAt = Day.iso(now); updatedAt = Day.iso(now)
    }
}

public struct Category: Codable, Identifiable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var emoji: String
    public var createdAt: String
    public var updatedAt: String

    public init(id: String, name: String, emoji: String, now: Date) {
        self.id = id; self.name = name; self.emoji = emoji
        createdAt = Day.iso(now); updatedAt = Day.iso(now)
    }
}

public struct PricePhase: Codable, Identifiable, Equatable, Sendable {
    public var id: String
    public var subscriptionId: String
    public var kind: PhaseKind
    public var cost: String
    public var currency: String
    public var startsAt: String
    public var endsAt: String?
    public var appliedAt: String?
    public var createdAt: String
    public var updatedAt: String

    public init(id: String, subscriptionId: String, kind: PhaseKind, cost: String, currency: String,
                startsAt: String, endsAt: String? = nil, appliedAt: String? = nil, now: Date) {
        self.id = id; self.subscriptionId = subscriptionId; self.kind = kind
        self.cost = cost; self.currency = currency.lowercased(); self.startsAt = startsAt
        self.endsAt = endsAt; self.appliedAt = appliedAt
        createdAt = Day.iso(now); updatedAt = Day.iso(now)
    }
}

public struct Preferences: Codable, Equatable, Sendable {
    public var preferredCurrency: String
    public var preferredTimezone: String
    public var dateFormat: String
    public var locale: String
    public var theme: String

    public init(currency: String = "uah", timezone: String = "UTC") {
        preferredCurrency = currency.lowercased(); preferredTimezone = timezone
        dateFormat = "DD/MM/YYYY"; locale = "en"; theme = "system"
    }
}

public struct StoreDocument: Codable, Equatable, Sendable {
    public var v: Int = 1
    public var preferences: Preferences
    public var categories: [Category]
    public var subscriptions: [Subscription]
    public var phases: [PricePhase]

    public init(preferences: Preferences = .init(), categories: [Category] = [],
                subscriptions: [Subscription] = [], phases: [PricePhase] = []) {
        self.preferences = preferences; self.categories = categories
        self.subscriptions = subscriptions; self.phases = phases
    }
}

public enum DomainError: Error, Equatable, Sendable {
    case invalidDocument(String)
    case invalidField(String)
    case notFound
    case conflict
    case illegalAction
    case unsupportedVersion(Int)
    case migrationRequired
    case cloudQuota
}

public enum JSONCodec {
    public static func encode<T: Encodable>(_ value: T) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(value)
    }
    public static func string<T: Encodable>(_ value: T) throws -> String {
        String(decoding: try encode(value), as: UTF8.self)
    }
    public static func decode<T: Decodable>(_ type: T.Type, _ data: Data) throws -> T {
        try JSONDecoder().decode(type, from: data)
    }
}
