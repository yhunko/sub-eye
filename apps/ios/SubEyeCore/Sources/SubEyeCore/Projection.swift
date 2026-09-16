import Foundation

public struct SubscriptionRow: Codable, Identifiable, Equatable, Sendable {
    public var id: String { subscription.id }
    public var subscription: Subscription
    public var category: Category?
    public var status: SubscriptionStatus
    public var amount: Double
    public var monthly: Double
    public var nextDate: Date?
    public var nextAmount: Double?
    public var effectiveKind: PhaseKind
    public var upcoming: PricePhase?
    public var phases: [PricePhase]
    public var allowedActions: [LifecycleAction] { Lifecycle.actions(status) }
}

public enum EventKind: String, Codable, Sendable, CaseIterable {
    case trialEnds, introEnds, priceChange, payment, resumes, ends
    public var rank: Int { Self.allCases.firstIndex(of: self)! }
}

public struct CalendarEvent: Codable, Identifiable, Equatable, Sendable {
    public var id: String { "\(subscriptionId):\(kind.rawValue):\(Day.key(date))" }
    public var subscriptionId: String
    public var name: String
    public var domain: String?
    public var kind: EventKind
    public var date: Date
    public var amount: Double
}

public struct Dashboard: Codable, Equatable, Sendable {
    public var monthly: Double = 0
    public var yearly: Double = 0
    public var remaining: Double = 0
    public var monthTotal: Double = 0
    public var nextMonth: Double = 0
    public var previousMonth: Double = 0
    public var activeCount: Int = 0
    public var monthEvents: [CalendarEvent] = []
    public var upcoming: [CalendarEvent] = []
    public var decisions: [CalendarEvent] = []
    public var paymentDays: [String: PaymentDay]? = nil
    public init() {}
}

public struct PaymentDay: Codable, Equatable, Sendable {
    public var count: Int
    public var total: Double
}

public struct Presentation: Codable, Equatable, Sendable {
    public var preferences: Preferences
    public var categories: [Category]
    public var rows: [SubscriptionRow]
    public var dashboard: Dashboard
    public var revision: Int64
    public var totalCount: Int
    public var generatedAt: Date

    public init(preferences: Preferences = .init(), categories: [Category] = [], rows: [SubscriptionRow] = [],
                dashboard: Dashboard = .init(), revision: Int64 = 0, totalCount: Int = 0, generatedAt: Date = .distantPast) {
        self.preferences = preferences; self.categories = categories; self.rows = rows
        self.dashboard = dashboard; self.revision = revision; self.totalCount = totalCount; self.generatedAt = generatedAt
    }

    public func launchPreview() -> Presentation {
        var copy = self
        copy.rows = Array(rows.prefix(40)).map { row in
            var reduced = row; reduced.phases = []; return reduced
        }
        copy.categories = Array(categories.prefix(100))
        copy.dashboard.monthEvents = Array(dashboard.monthEvents.prefix(120))
        copy.dashboard.decisions = Array(dashboard.decisions.prefix(30))
        return copy
    }
}

public enum Projection {
    public static func rows(_ doc: StoreDocument, rates: ExchangeRates, now: Date) -> [SubscriptionRow] {
        let phases = Dictionary(grouping: doc.phases, by: \.subscriptionId)
        let categories = Dictionary(uniqueKeysWithValues: doc.categories.map { ($0.id, $0) })
        let currency = doc.preferences.preferredCurrency
        let zone = TimeZone(identifier: doc.preferences.preferredTimezone) ?? .gmt
        let today = Day.today(now, zone: zone)
        return doc.subscriptions.map { subscription in
            let schedule = (phases[subscription.id] ?? []).sorted {
                (Day.parse($0.startsAt) ?? .distantPast) < (Day.parse($1.startsAt) ?? .distantPast)
            }
            let amount = rates.convert(Double(subscription.cost) ?? 0, from: subscription.currency, to: currency)
            let next = Recurrence.next(subscription, onOrAfter: today)
            let charged = next.map { Lifecycle.includes(subscription, occurrence: $0) && !Lifecycle.isPaused(subscription, occurrence: $0) } ?? false
            return SubscriptionRow(subscription: subscription, category: subscription.categoryId.flatMap { categories[$0] },
                                   status: Lifecycle.status(subscription, now: now, zone: zone), amount: amount,
                                   monthly: Money.monthly(amount, every: subscription.every, period: subscription.period),
                                   nextDate: next, nextAmount: charged ? next.map { Pricing.amount(subscription, phases: schedule, on: $0, rates: rates, currency: currency) } : nil,
                                   effectiveKind: Pricing.effective(schedule, at: now)?.kind ?? .standard,
                                   upcoming: Pricing.upcoming(schedule, at: now), phases: schedule)
        }.sorted { ($0.nextDate ?? .distantFuture, $0.id) < ($1.nextDate ?? .distantFuture, $1.id) }
    }

    public static func payments(_ rows: [SubscriptionRow], from: Date, through: Date,
                                rates: ExchangeRates, currency: String) -> [CalendarEvent] {
        var output: [CalendarEvent] = []
        for row in rows {
            let sub = row.subscription
            guard let anchor = Day.parse(sub.paymentDate), sub.every > 0 else { continue }
            let phases = row.phases.compactMap { phase -> (PricePhase, Date, Date?)? in
                guard let start = Day.parse(phase.startsAt) else { return nil }
                return (phase, start, Day.parse(phase.endsAt))
            }
            let cancel = Day.parse(sub.willBeCancelledAt), paused = Day.parse(sub.pausedAt), resume = Day.parse(sub.resumeAt)
            var index = Recurrence.nextIndex(anchor: anchor, every: sub.every, period: sub.period, onOrAfter: from)
            var date = Recurrence.occurrence(anchor: anchor, every: sub.every, period: sub.period, index: index)
            while date <= through {
                if let cancel, date >= cancel { break }
                if !(paused.map { date >= $0 && (resume.map { date < $0 } ?? true) } ?? false) {
                    let phase = phases.first { $0.1 <= date && ($0.2.map { date < $0 } ?? true) }?.0
                    let amount = rates.convert(Double(phase?.cost ?? sub.cost) ?? 0, from: phase?.currency ?? sub.currency, to: currency)
                    output.append(CalendarEvent(subscriptionId: sub.id, name: sub.name, domain: sub.brandDomain,
                                                kind: .payment, date: date, amount: amount))
                }
                index += 1
                date = Recurrence.occurrence(anchor: anchor, every: sub.every, period: sub.period, index: index)
            }
        }
        return output.sorted { $0.date == $1.date ? $0.amount > $1.amount : $0.date < $1.date }
    }

    public static func events(_ rows: [SubscriptionRow], from: Date, through: Date, rates: ExchangeRates, currency: String) -> [CalendarEvent] {
        var result = payments(rows, from: from, through: through, rates: rates, currency: currency)
        for row in rows where row.status != .cancelled {
            func append(_ raw: String?, kind: EventKind, amount: Double) {
                guard let date = Day.parse(raw), date >= from, date <= through else { return }
                result.append(CalendarEvent(subscriptionId: row.id, name: row.subscription.name, domain: row.subscription.brandDomain,
                                            kind: kind, date: date, amount: amount))
            }
            if let next = row.upcoming {
                let kind: EventKind = row.effectiveKind == .trial ? .trialEnds : row.effectiveKind == .intro ? .introEnds : .priceChange
                append(next.startsAt, kind: kind, amount: rates.convert(Double(next.cost) ?? 0, from: next.currency, to: currency))
            }
            if row.status == .paused { append(row.subscription.resumeAt, kind: .resumes, amount: row.amount) }
            if row.status == .cancelling { append(row.subscription.willBeCancelledAt, kind: .ends, amount: row.amount) }
        }
        return result.sorted { $0.date == $1.date ? ($0.kind.rank == $1.kind.rank ? $0.amount > $1.amount : $0.kind.rank < $1.kind.rank) : $0.date < $1.date }
    }

    public static func presentation(_ doc: StoreDocument, rates: ExchangeRates, now: Date, revision: Int64) -> Presentation {
        let rows = rows(doc, rates: rates, now: now)
        let zone = TimeZone(identifier: doc.preferences.preferredTimezone) ?? .gmt
        let today = Day.today(now, zone: zone), start = Day.monthStart(Day.today(now, zone: zone))
        let currency = doc.preferences.preferredCurrency
        let active = rows.filter { $0.status.isCurrent && $0.nextAmount != nil }
        let monthPayments = payments(active, from: start, through: Day.shift(Day.month(start, offset: 1), days: -1), rates: rates, currency: currency)
        var dashboard = Dashboard()
        dashboard.monthly = active.reduce(0) { $0 + $1.monthly }
        dashboard.yearly = payments(active, from: today, through: Day.utc.date(byAdding: .month, value: 12, to: today)!, rates: rates, currency: currency).reduce(0) { $0 + $1.amount }
        dashboard.monthTotal = monthPayments.reduce(0) { $0 + $1.amount }
        dashboard.remaining = monthPayments.filter { $0.date >= today }.reduce(0) { $0 + $1.amount }
        dashboard.nextMonth = payments(active, from: Day.month(start, offset: 1), through: Day.shift(Day.month(start, offset: 2), days: -1), rates: rates, currency: currency).reduce(0) { $0 + $1.amount }
        dashboard.previousMonth = payments(rows, from: Day.month(start, offset: -1), through: Day.shift(start, days: -1), rates: rates, currency: currency).reduce(0) { $0 + $1.amount }
        dashboard.activeCount = active.count; dashboard.monthEvents = monthPayments
        dashboard.paymentDays = Dictionary(grouping: monthPayments, by: { Day.key($0.date) }).mapValues {
            PaymentDay(count: $0.count, total: $0.reduce(0) { $0 + $1.amount })
        }
        dashboard.upcoming = Array(active.compactMap { row -> CalendarEvent? in
            guard let date = row.nextDate, let amount = row.nextAmount else { return nil }
            return CalendarEvent(subscriptionId: row.id, name: row.subscription.name, domain: row.subscription.brandDomain, kind: .payment, date: date, amount: amount)
        }.sorted { $0.date < $1.date }.prefix(5))
        dashboard.decisions = events(rows, from: today, through: Day.shift(today, days: 30), rates: rates, currency: currency).filter { $0.kind != .payment }
        return Presentation(preferences: doc.preferences, categories: doc.categories, rows: rows, dashboard: dashboard,
                            revision: revision, totalCount: rows.count, generatedAt: now)
    }
}
