import Foundation

public struct InstallmentPayment: Equatable, Sendable {
    public var number: Int
    public var date: Date
    public var amount: Decimal
    public var paid: Bool
}

public enum Installments {
    // A loan total is a sum, not a single charge: a car loan in dong passes the 1e8 entry ceiling. 1e12 stays exact to the cent in Double.
    public static let ceiling: Decimal = 1_000_000_000_000

    public static func payments(_ plan: InstallmentPlan, today: Date) -> [InstallmentPayment] {
        let cutoff = Day.parse(plan.paidOffAt).map(Day.floor)
        return schedule(plan, today: today).filter { payment in
            guard let cutoff else { return true }
            return payment.date < cutoff || atPurchase(plan, payment)
        }
    }

    public static func payoff(_ plan: InstallmentPlan) -> (date: Date, amount: Decimal)? {
        guard let date = Day.parse(plan.paidOffAt).map(Day.floor),
              let amount = Money.parse(plan.payoffAmount ?? "", below: ceiling) else { return nil }
        return (date, amount)
    }

    public static func remaining(_ plan: InstallmentPlan, on day: Date) -> Decimal {
        let day = Day.floor(day)
        return schedule(plan, today: day).filter { $0.date >= day && !atPurchase(plan, $0) }.reduce(0) { $0 + $1.amount }
    }

    // `spent` is what the plan costs in the end: the payoff replaces every payment it cut.
    public static func totals(_ plan: InstallmentPlan, today: Date) -> (paid: Decimal, left: Decimal, spent: Decimal) {
        let kept = payments(plan, today: today)
        var paid = kept.filter(\.paid).reduce(Decimal(0)) { $0 + $1.amount }
        var left = kept.filter { !$0.paid }.reduce(Decimal(0)) { $0 + $1.amount }
        if let payoff = payoff(plan) {
            if payoff.date <= Day.floor(today) { paid += payoff.amount } else { left += payoff.amount }
        }
        return (paid, left, paid + left)
    }

    // Rounding up keeps the last payment from being the largest, which is how lenders quote an equal split.
    public static func regularPayment(total: Decimal, count: Int) -> Decimal? {
        guard count > 0, total > 0 else { return nil }
        var exact = total / Decimal(count), rounded = Decimal()
        NSDecimalRound(&rounded, &exact, 2, .up)
        return rounded * Decimal(count - 1) < total ? rounded : nil
    }

    public static func editorAccepts(every: Int, period: BillingPeriod, count: Int) -> Bool {
        ((every == 1 && period == .month) || (every == 2 && period == .week)) && (1...360).contains(count)
    }

    private static func schedule(_ plan: InstallmentPlan, today: Date) -> [InstallmentPayment] {
        guard let anchor = Day.parse(plan.firstPaymentDate).map(Day.floor), plan.paymentCount > 0,
              let total = Money.parse(plan.total, below: ceiling),
              let regular = Money.parse(plan.payment, below: ceiling) else { return [] }
        return (0..<plan.paymentCount).map { index in
            let date = Recurrence.occurrence(anchor: anchor, every: plan.every, period: plan.period, index: index)
            let amount = index == plan.paymentCount - 1 ? total - regular * Decimal(plan.paymentCount - 1) : regular
            var payment = InstallmentPayment(number: index + 1, date: date, amount: amount, paid: date < today)
            if atPurchase(plan, payment) { payment.paid = true }
            return payment
        }
    }

    // The day after creation covers a plan added late at night east of UTC, whose local day is already the next UTC day.
    private static func atPurchase(_ plan: InstallmentPlan, _ payment: InstallmentPayment) -> Bool {
        guard payment.number == 1, plan.paidAtPurchase == true,
              let created = Day.parse(plan.createdAt).map(Day.floor) else { return false }
        return payment.date <= Day.shift(created, days: 1)
    }
}
