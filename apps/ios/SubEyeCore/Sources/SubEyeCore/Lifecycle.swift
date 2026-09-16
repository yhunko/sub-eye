import Foundation

public enum LifecycleAction: String, Codable, Sendable {
    case edit, pricing, pause, resume, cancel, keep, restart, delete
}

public enum Lifecycle {
    public static func status(_ subscription: Subscription, now: Date, zone: TimeZone) -> SubscriptionStatus {
        let today = Day.today(now, zone: zone)
        if let cancellation = Day.parse(subscription.willBeCancelledAt) {
            return Day.floor(cancellation) > today ? .cancelling : .cancelled
        }
        guard let paused = Day.parse(subscription.pausedAt), paused <= now else { return .active }
        if let resume = Day.parse(subscription.resumeAt), resume <= today { return .active }
        return .paused
    }

    public static func actions(_ status: SubscriptionStatus) -> [LifecycleAction] {
        switch status {
        case .active: return [.edit, .pricing, .pause, .cancel, .delete]
        case .paused: return [.edit, .resume, .cancel, .delete]
        case .cancelling: return [.edit, .keep, .delete]
        case .cancelled: return [.restart, .delete]
        }
    }

    public static func includes(_ subscription: Subscription, occurrence: Date) -> Bool {
        guard let cancellation = Day.parse(subscription.willBeCancelledAt) else { return true }
        return occurrence < cancellation
    }

    public static func isPaused(_ subscription: Subscription, occurrence: Date) -> Bool {
        guard let paused = Day.parse(subscription.pausedAt), occurrence >= paused else { return false }
        guard let resume = Day.parse(subscription.resumeAt) else { return true }
        return occurrence < resume
    }

    public static func change(_ subscription: Subscription, action: LifecycleAction, day: Date? = nil,
                              immediate: Bool = false, now: Date, zone: TimeZone) throws -> Subscription {
        let state = status(subscription, now: now, zone: zone)
        guard actions(state).contains(action) else { throw DomainError.illegalAction }
        var next = subscription
        let today = Day.today(now, zone: zone)
        switch action {
        case .cancel:
            guard let end = immediate ? today : (day ?? Recurrence.next(subscription, onOrAfter: today)) else {
                throw DomainError.invalidField("paymentDate")
            }
            next.willBeCancelledAt = Day.iso(Day.floor(end))
        case .keep, .restart:
            if action == .restart {
                guard let day, Day.floor(day) <= today else { throw DomainError.invalidField("restartDate") }
                next.paymentDate = Day.iso(Day.floor(day))
            }
            next.willBeCancelledAt = nil; next.pausedAt = nil; next.resumeAt = nil
        case .pause:
            if let day, Day.floor(day) <= today { throw DomainError.invalidField("resumeAt") }
            next.pausedAt = Day.iso(now); next.resumeAt = day.map { Day.iso(Day.floor($0)) }
        case .resume:
            guard let anchor = Recurrence.next(subscription, onOrAfter: today) else { throw DomainError.invalidField("paymentDate") }
            next.paymentDate = Day.iso(anchor); next.pausedAt = nil; next.resumeAt = nil
        default: throw DomainError.illegalAction
        }
        next.updatedAt = Day.iso(now); next.status = status(next, now: now, zone: zone)
        return next
    }
}
