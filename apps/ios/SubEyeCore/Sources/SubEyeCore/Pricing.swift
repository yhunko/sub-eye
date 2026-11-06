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
        // An applied phase stays open-ended while a later one waits to settle, so windows overlap and the
        // latest-starting one owns the date — the price `settle` will have made true by then.
        let phase = effective(phases, at: date)
        return rates.convert(Double(phase?.cost ?? subscription.cost) ?? 0,
                             from: phase?.currency ?? subscription.currency, to: currency)
    }

    // A standard phase after an intro is a price change too; a trial or intro starting is an offer, not a change.
    public static func yearlyChange(_ subscription: Subscription, to next: PricePhase) -> Double? {
        guard next.kind == .scheduledChange || next.kind == .standard,
              subscription.currency.lowercased() == next.currency.lowercased(),
              let from = Double(subscription.cost), let to = Double(next.cost), from != to else { return nil }
        let yearly = Money.monthly(abs(to - from), every: subscription.every, period: subscription.period) * 12
        return to > from ? yearly : -yearly
    }

    // Across a currency switch the two prices only compare once both are in `currency`, at today's rates: €10 reads
    // lower than $11.99 and costs more. The result is in `currency`. Each converted price is rounded to the cent first,
    // so the yearly figure agrees with the two prices the screen shows beside it.
    public static func yearlyChange(_ subscription: Subscription, to next: PricePhase, rates: ExchangeRates, currency: String) -> Double? {
        func cents(_ value: Double) -> Double { (value * 100).rounded() / 100 }
        guard next.kind == .scheduledChange || next.kind == .standard,
              let from = Double(subscription.cost).flatMap({ rates.converted($0, from: subscription.currency, to: currency) }).map(cents),
              let to = Double(next.cost).flatMap({ rates.converted($0, from: next.currency, to: currency) }).map(cents) else { return nil }
        let yearly = Money.monthly(abs(to - from), every: subscription.every, period: subscription.period) * 12
        guard (yearly * 100).rounded() != 0 else { return nil }
        return to > from ? yearly : -yearly
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

    // The window is one cycle from the purchase, not a picked date: renewals fall on the anchor, so any other end would put
    // a second license charge inside the window or start renewals between payments. The subscription keeps the renewal
    // price from the start — the license is paid once, so only its phase may price the purchase, never the monthly figure.
    // A purchase long past keeps its phases so the row still reads as a license whose charges renew updates.
    public static func license(subscription: inout Subscription, licenseCost: String, renewalCost: String, currency: String,
                               now: Date, ids: (String, String)) throws -> [PricePhase] {
        guard let price = Money.parse(licenseCost), price > 0, let renewal = Money.parse(renewalCost),
              let purchase = Day.parse(subscription.paymentDate) else { throw DomainError.invalidField("cost") }
        let end = Recurrence.occurrence(anchor: purchase, every: subscription.every, period: subscription.period, index: 1)
        let renewed = end <= now
        subscription.cost = Money.canonical(renewal); subscription.currency = currency.lowercased()
        subscription.updatedAt = Day.iso(now)
        return [
            PricePhase(id: ids.0, subscriptionId: subscription.id, kind: .license, cost: Money.canonical(price), currency: currency,
                       startsAt: Day.iso(min(purchase, now)), endsAt: Day.iso(end), appliedAt: Day.iso(now), now: now),
            PricePhase(id: ids.1, subscriptionId: subscription.id, kind: .standard, cost: Money.canonical(renewal), currency: currency,
                       startsAt: Day.iso(end), appliedAt: renewed ? Day.iso(now) : nil, now: now)
        ]
    }

    public static func licenseRenewal(_ phases: [PricePhase]) -> PricePhase? {
        guard let license = phases.first(where: { $0.kind == .license }) else { return nil }
        return phases.first { $0.kind == .standard && $0.startsAt == license.endsAt }
    }

    // The window is stored as dates, so an edit that moves the purchase or changes the cadence or renewal price rebuilds it
    // from the edited subscription; otherwise a later payment lands inside the old window and is charged as a second license.
    public static func realignLicense(subscription: inout Subscription, phases: [PricePhase], now: Date) throws -> [PricePhase]? {
        guard let license = phases.first(where: { $0.kind == .license }) else { return nil }
        return try self.license(subscription: &subscription, licenseCost: license.cost, renewalCost: subscription.cost,
                                currency: subscription.currency, now: now,
                                ids: (license.id, licenseRenewal(phases)?.id ?? license.id + "-renewal"))
    }

    // Restarting moves the anchor to the restart day; inside the window that charge renews updates, it is no second purchase.
    public static func restartLicense(phases: [PricePhase], on day: Date, now: Date) -> [PricePhase] {
        guard var license = phases.first(where: { $0.kind == .license }), let start = Day.parse(license.startsAt),
              let end = Day.parse(license.endsAt), day > start, day < end else { return [] }
        var renewal = licenseRenewal(phases)
        license.endsAt = Day.iso(day); license.updatedAt = Day.iso(now)
        renewal?.startsAt = Day.iso(day); renewal?.appliedAt = Day.iso(now); renewal?.updatedAt = Day.iso(now)
        return [license] + [renewal].compactMap { $0 }
    }

    private static func validateBoundary(_ subscription: Subscription, boundary: Date, now: Date) throws {
        guard boundary >= Day.floor(now) else { throw DomainError.invalidField("boundary") }
        if let cancellation = Day.parse(subscription.willBeCancelledAt), boundary >= cancellation {
            throw DomainError.illegalAction
        }
    }
}
