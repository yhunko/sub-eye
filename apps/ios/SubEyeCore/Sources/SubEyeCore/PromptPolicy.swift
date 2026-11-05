import Foundation

public struct ReviewState: Codable, Equatable, Sendable {
    public var firstSeenAt: Double
    public var askedAt: Double
    public init(firstSeenAt: Double = 0, askedAt: Double = 0) { self.firstSeenAt = firstSeenAt; self.askedAt = askedAt }
    public func isDue(now: Date, tracked: Int) -> Bool {
        let milliseconds = now.timeIntervalSince1970 * 1000
        return firstSeenAt > 0 && tracked >= 3 && milliseconds - firstSeenAt >= 7 * 86_400_000 && cooled(now: now)
    }
    public func cooled(now: Date) -> Bool { askedAt == 0 || now.timeIntervalSince1970 * 1000 - askedAt >= 180 * 86_400_000 }
}

public enum UserPrompt: String, Sendable { case reminders, pro, review }
public enum PromptPolicy {
    public static func home(saved: Double, firstSeenAt: Double, now: Date, pro: Bool, proPitched: Bool, reviewDue: Bool, interrupted: Bool, remindersPending: Bool,
                            celebrating: Bool = false, reviewCooled: Bool = true) -> UserPrompt? {
        guard !interrupted, !remindersPending else { return nil }
        if reviewDue || celebrating && reviewCooled { return .review }
        let settled = firstSeenAt > 0 && now.timeIntervalSince1970 * 1000 - firstSeenAt >= 14 * 86_400_000
        return !pro && !proPitched && (saved > 0 || settled) ? .pro : nil
    }
}
