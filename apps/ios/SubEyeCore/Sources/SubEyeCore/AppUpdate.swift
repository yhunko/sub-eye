import Foundation

public struct StoreRelease: Codable, Equatable, Sendable {
    public var version: String
    public var releasedAt: Date
    public var minimumOS: String
    public var notes: String?
    public init(version: String, releasedAt: Date, minimumOS: String, notes: String? = nil) {
        self.version = version; self.releasedAt = releasedAt; self.minimumOS = minimumOS; self.notes = notes
    }

    public init?(lookup data: Data) {
        guard let raw = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let result = (raw["results"] as? [[String: Any]])?.first,
              let version = result["version"] as? String,
              let released = (result["currentVersionReleaseDate"] as? String).flatMap({ try? Date($0, strategy: .iso8601) }),
              let minimumOS = result["minimumOsVersion"] as? String else { return nil }
        let notes = (result["releaseNotes"] as? String)?.split(whereSeparator: \.isNewline)
            .map { $0.trimmingCharacters(in: .whitespaces) }.first { !$0.isEmpty }
        self.init(version: version, releasedAt: released, minimumOS: minimumOS, notes: notes)
    }
}

public struct UpdateCheck: Codable, Equatable, Sendable {
    public var checkedAt: Date
    public var release: StoreRelease?
    public init(checkedAt: Date, release: StoreRelease?) { self.checkedAt = checkedAt; self.release = release }
}

public enum UpdatePolicy {
    public static let interval: TimeInterval = 86_400
    public static let grace: TimeInterval = 3 * 86_400

    public static func isDue(_ check: UpdateCheck?, now: Date) -> Bool {
        guard let check else { return true }
        let elapsed = now.timeIntervalSince(check.checkedAt)
        return elapsed < 0 || elapsed >= interval
    }

    public static func available(_ release: StoreRelease?, installed: String, system: String, now: Date, firstSession: Bool) -> Bool {
        guard let release, !firstSession, isNewer(release.version, than: installed),
              let os = components(system), let minimum = components(release.minimumOS) else { return false }
        return !precedes(os, minimum) && now.timeIntervalSince(release.releasedAt) >= grace
    }

    public static func shows(_ release: StoreRelease?, installed: String, system: String, now: Date, firstSession: Bool, hiddenFor version: String?) -> Bool {
        available(release, installed: installed, system: system, now: now, firstSession: firstSession) && release?.version != version
    }

    public static func isNewer(_ candidate: String, than current: String) -> Bool {
        guard let candidate = components(candidate), let current = components(current) else { return false }
        return precedes(current, candidate)
    }

    private static func components(_ version: String) -> [Int]? {
        let parts = version.split(separator: ".", omittingEmptySubsequences: false).map { UInt($0) }
        guard parts.allSatisfy({ $0 != nil }) else { return nil }
        return parts.map { Int($0!) }
    }

    private static func precedes(_ lhs: [Int], _ rhs: [Int]) -> Bool {
        let count = max(lhs.count, rhs.count)
        let padded = { (parts: [Int]) in parts + Array(repeating: 0, count: count - parts.count) }
        return padded(lhs).lexicographicallyPrecedes(padded(rhs))
    }
}
