import Foundation

public struct SavingsLedger: Codable, Equatable, Sendable {
    public var total: Double = 0
    public var monthly: Double = 0
    public var stopped: Int = 0
    public var subscriptions: [String: Double] = [:]
    public var sinceEnded: [String: Double] = [:]
    public init() {}
}

public enum Savings {
    public static func skipped(_ subscription: Subscription, phases: [PricePhase], from: Date? = nil, through: Date,
                               zone: TimeZone, rates: ExchangeRates, currency: String) -> Double {
        guard let anchor = Day.parse(subscription.paymentDate), subscription.every > 0,
              let created = Day.parse(subscription.createdAt),
              let stop = [Day.parse(subscription.willBeCancelledAt), Day.parse(subscription.pausedAt)].compactMap({ $0 }).map(Day.floor).min()
        else { return 0 }
        let start = max(from ?? stop, stop, Day.today(created, zone: zone))
        var index = Recurrence.nextIndex(anchor: anchor, every: subscription.every, period: subscription.period, onOrAfter: start)
        var date = Recurrence.occurrence(anchor: anchor, every: subscription.every, period: subscription.period, index: index)
        var total = 0.0
        while date <= through {
            if !Lifecycle.includes(subscription, occurrence: date) || Lifecycle.isPaused(subscription, occurrence: date) {
                total += Pricing.amount(subscription, phases: phases, on: date, rates: rates, currency: currency)
            }
            index += 1
            date = Recurrence.occurrence(anchor: anchor, every: subscription.every, period: subscription.period, index: index)
        }
        return total
    }

    public static func ledger(_ rows: [SubscriptionRow], rates: ExchangeRates, currency: String, now: Date, zone: TimeZone) -> SavingsLedger {
        let today = Day.today(now, zone: zone)
        var ledger = SavingsLedger()
        for row in rows {
            let sub = row.subscription
            let banked = rates.convert(Double(sub.bankedSavings ?? "") ?? 0, from: sub.currency, to: currency)
            let saved = banked + skipped(sub, phases: row.phases, through: today, zone: zone, rates: rates, currency: currency)
            if saved > 0 { ledger.subscriptions[row.id] = saved; ledger.total += saved }
            guard row.status == .cancelled, let end = Day.parse(sub.willBeCancelledAt).map(Day.floor) else { continue }
            ledger.sinceEnded[row.id] = skipped(sub, phases: row.phases, from: end, through: today, zone: zone, rates: rates, currency: currency)
            ledger.stopped += 1
            ledger.monthly += Money.monthly(standard(sub, phases: row.phases, on: end, rates: rates, currency: currency),
                                            every: sub.every, period: sub.period)
        }
        return ledger
    }

    public static func annual(_ subscription: Subscription, phases: [PricePhase], from: Date,
                              rates: ExchangeRates, currency: String) -> Double {
        guard let anchor = Day.parse(subscription.paymentDate), subscription.every > 0 else { return 0 }
        let end = Day.utc.date(byAdding: .year, value: 1, to: from)!
        var index = Recurrence.nextIndex(anchor: anchor, every: subscription.every, period: subscription.period, onOrAfter: from)
        var date = Recurrence.occurrence(anchor: anchor, every: subscription.every, period: subscription.period, index: index)
        var total = 0.0
        while date < end {
            if !Lifecycle.isPaused(subscription, occurrence: date) {
                total += Pricing.amount(subscription, phases: phases, on: date, rates: rates, currency: currency)
            }
            index += 1
            date = Recurrence.occurrence(anchor: anchor, every: subscription.every, period: subscription.period, index: index)
        }
        return total
    }

    // Restart, resume, keep and re-pausing an elapsed pause all clear or overwrite
    // the dates `skipped` reads; what a transition would erase moves into
    // `bankedSavings` first, in the subscription's own currency.
    public static func bank(_ next: inout Subscription, previous: Subscription, action: LifecycleAction,
                            phases: [PricePhase], rates: ExchangeRates, now: Date, zone: TimeZone) {
        let today = Day.today(now, zone: zone)
        // A restart dated in the past means the user was paying again from that day.
        let resumed = action == .restart ? Day.parse(next.paymentDate).map(Day.floor) ?? today : today
        let through = charges(next, on: resumed) ? Day.shift(resumed, days: -1) : resumed
        let lost = skipped(previous, phases: phases, through: through, zone: zone, rates: rates, currency: next.currency)
            - skipped(next, phases: phases, through: through, zone: zone, rates: rates, currency: next.currency)
        guard lost > 0 else { return }
        next.bankedSavings = Money.canonical(decimal(next.bankedSavings) + Decimal(lost))
    }

    public static func rebase(_ next: inout Subscription, from currency: String, rates: ExchangeRates) {
        guard currency.lowercased() != next.currency.lowercased(), let banked = next.bankedSavings else { return }
        next.bankedSavings = Money.canonical(Decimal(rates.convert(Double(banked) ?? 0, from: currency, to: next.currency)))
    }

    public static func coversPrice(_ saved: Double, price: Decimal, priceCurrency: String?, currency: String, rates: ExchangeRates) -> Bool {
        guard let source = priceCurrency?.lowercased(), price > 0 else { return false }
        let target = currency.lowercased()
        guard source == target || (rates.rates[source] != nil && rates.rates[target] != nil) else { return false }
        return saved >= rates.convert(NSDecimalNumber(decimal: price).doubleValue, from: source, to: target)
    }

    private static func charges(_ subscription: Subscription, on day: Date) -> Bool {
        Recurrence.next(subscription, onOrAfter: day) == day && Lifecycle.includes(subscription, occurrence: day)
            && !Lifecycle.isPaused(subscription, occurrence: day)
    }

    private static func standard(_ subscription: Subscription, phases: [PricePhase], on day: Date,
                                 rates: ExchangeRates, currency: String) -> Double {
        let promotional: Set<PhaseKind> = [.trial, .intro]
        if let promo = Pricing.effective(phases, at: day), promotional.contains(promo.kind),
           let regular = Pricing.upcoming(phases.filter { !promotional.contains($0.kind) }, at: day) {
            return rates.convert(Double(regular.cost) ?? 0, from: regular.currency, to: currency)
        }
        return Pricing.amount(subscription, phases: phases, on: day, rates: rates, currency: currency)
    }

    private static func decimal(_ text: String?) -> Decimal {
        text.flatMap { Decimal(string: $0, locale: Locale(identifier: "en_US_POSIX")) } ?? 0
    }
}
