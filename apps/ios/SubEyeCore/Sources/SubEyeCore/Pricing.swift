import Foundation

public enum Pricing {
    public static func effective(_ phases: [PricePhase], at date: Date) -> PricePhase? {
        phases.filter { phase in
            guard let start = Day.parse(phase.startsAt), start <= date else { return false }
            return Day.parse(phase.endsAt).map { date < $0 } ?? true
        }.max { (Day.parse($0.startsAt) ?? .distantPast) < (Day.parse($1.startsAt) ?? .distantPast) }
    }

    public static func upcoming(_ phases: [PricePhase], at date: Date) -> PricePhase? {
        phases.filter { (Day.parse($0.startsAt) ?? .distantPast) > date }
            .min { (Day.parse($0.startsAt) ?? .distantPast) < (Day.parse($1.startsAt) ?? .distantPast) }
    }

    public static func amount(_ subscription: Subscription, phases: [PricePhase], on date: Date,
                              rates: ExchangeRates, currency: String) -> Double {
        // Occurrence pricing follows the first half-open window, matching @subeye/spend.
        let phase = phases.sorted { $0.startsAt < $1.startsAt }.first { phase in
            guard let start = Day.parse(phase.startsAt), start <= date else { return false }
            return Day.parse(phase.endsAt).map { date < $0 } ?? true
        }
        return rates.convert(Double(phase?.cost ?? subscription.cost) ?? 0,
                             from: phase?.currency ?? subscription.currency, to: currency)
    }

    public static func apply(_ phaseId: String, subscription: inout Subscription,
                             phases: inout [PricePhase], now: Date) throws {
        guard let index = phases.firstIndex(where: { $0.id == phaseId }) else { throw DomainError.notFound }
        guard phases[index].appliedAt == nil else { return }
        let preceding = effective(phases.filter { $0.id != phaseId }, at: now)
        if let preceding, let old = phases.firstIndex(where: { $0.id == preceding.id }) {
            phases[old].endsAt = Day.iso(now); phases[old].updatedAt = Day.iso(now)
        }
        if (Day.parse(phases[index].startsAt) ?? .distantFuture) > now { phases[index].startsAt = Day.iso(now) }
        phases[index].appliedAt = Day.iso(now); phases[index].updatedAt = Day.iso(now)
        subscription.cost = phases[index].cost; subscription.currency = phases[index].currency
        subscription.updatedAt = Day.iso(now)
    }

    public static func settle(subscription: inout Subscription, phases: inout [PricePhase], now: Date) throws {
        let due = phases.filter { $0.appliedAt == nil && (Day.parse($0.startsAt) ?? .distantFuture) <= now }
            .sorted { (Day.parse($0.startsAt) ?? .distantFuture) < (Day.parse($1.startsAt) ?? .distantFuture) }
        for phase in due { try apply(phase.id, subscription: &subscription, phases: &phases, now: now) }
    }

    public static func scheduled(_ subscription: Subscription, cost: String, currency: String,
                                 on date: Date?, now: Date, zone: TimeZone, id: String) throws -> PricePhase {
        guard Money.parse(cost) != nil else { throw DomainError.invalidField("cost") }
        var start: Date
        if let date { start = Day.floor(date) }
        else {
            guard let next = Recurrence.next(subscription, onOrAfter: Day.today(now, zone: zone)) else {
                throw DomainError.invalidField("paymentDate")
            }
            start = next
            if start <= now {
                guard let following = Recurrence.next(subscription, onOrAfter: Day.shift(start, days: 1)) else {
                    throw DomainError.invalidField("paymentDate")
                }
                start = following
            }
        }
        try validateBoundary(subscription, boundary: start, now: now)
        return PricePhase(id: id, subscriptionId: subscription.id, kind: .scheduledChange,
                          cost: cost, currency: currency, startsAt: Day.iso(start), now: now)
    }

    public static func offer(subscription: inout Subscription, promoCost: String, standardCost: String,
                             currency: String, payments: Int?, endDate: Date?, deferred: Bool,
                             now: Date, zone: TimeZone, ids: (String, String)) throws -> [PricePhase] {
        guard let promo = Money.parse(promoCost), Money.parse(standardCost) != nil,
              let first = Recurrence.next(subscription, onOrAfter: Day.today(now, zone: zone)) else {
            throw DomainError.invalidField("cost")
        }
        let start = deferred ? first : now
        let boundary: Date
        if let payments, payments > 0, payments <= 120 {
            guard let anchor = Day.parse(subscription.paymentDate) else { throw DomainError.invalidField("paymentDate") }
            let firstIndex = Recurrence.nextIndex(anchor: anchor, every: subscription.every, period: subscription.period, onOrAfter: first)
            boundary = Recurrence.occurrence(anchor: anchor, every: subscription.every,
                                             period: subscription.period, index: firstIndex + payments)
        } else if let endDate { boundary = Day.floor(endDate) }
        else { throw DomainError.invalidField("offerEndsAt") }
        try validateBoundary(subscription, boundary: boundary, now: now)
        guard boundary > start else { throw DomainError.invalidField("offerEndsAt") }
        if !deferred {
            subscription.cost = Money.canonical(promo); subscription.currency = currency.lowercased()
            subscription.updatedAt = Day.iso(now)
        }
        return [
            PricePhase(id: ids.0, subscriptionId: subscription.id, kind: promo == 0 ? .trial : .intro,
                       cost: Money.canonical(promo), currency: currency, startsAt: Day.iso(start),
                       endsAt: Day.iso(boundary), appliedAt: deferred ? nil : Day.iso(now), now: now),
            PricePhase(id: ids.1, subscriptionId: subscription.id, kind: .standard, cost: standardCost,
                       currency: currency, startsAt: Day.iso(boundary), now: now)
        ]
    }

    private static func validateBoundary(_ subscription: Subscription, boundary: Date, now: Date) throws {
        guard boundary >= Day.floor(now) else { throw DomainError.invalidField("boundary") }
        if let cancellation = Day.parse(subscription.willBeCancelledAt), boundary >= cancellation {
            throw DomainError.illegalAction
        }
    }
}
