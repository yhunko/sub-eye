import Foundation

public struct ReviewState: Codable, Equatable, Sendable {
    public var firstSeenAt: Double
    public var askedAt: Double
    public init(firstSeenAt: Double = 0, askedAt: Double = 0) { self.firstSeenAt = firstSeenAt; self.askedAt = askedAt }
    public func isDue(now: Date, tracked: Int) -> Bool {
        let milliseconds = now.timeIntervalSince1970 * 1000
        return firstSeenAt > 0 && tracked >= 3 && milliseconds - firstSeenAt >= 7 * 86_400_000
            && (askedAt == 0 || milliseconds - askedAt >= 180 * 86_400_000)
    }
}

public enum UserPrompt: String, Sendable { case reminders, pro, review }
public enum PromptPolicy {
    public static func home(tracked: Int, pro: Bool, proPitched: Bool, reviewDue: Bool, interrupted: Bool, remindersPending: Bool) -> UserPrompt? {
        guard !interrupted, !remindersPending else { return nil }
        if !pro && !proPitched && tracked >= 3 { return .pro }
        return reviewDue ? .review : nil
    }
}
