import Foundation

public struct ListOptions: Codable, Equatable, Sendable {
    public var status = "active"
    public var categoryId: String?
    public var sort = "next"
    public var group = "none"
    public init() {}
    private enum CodingKeys: String, CodingKey { case status, categoryId, sort, group }
    public init(from decoder: Decoder) throws {
        self.init()
        guard let values = try? decoder.container(keyedBy: CodingKeys.self) else { return }
        if let value = try? values.decode(String.self, forKey: .status), ["active", "all", "paused", "cancelling", "cancelled"].contains(value) { status = value }
        if let value = try? values.decode(String.self, forKey: .categoryId), !value.isEmpty { categoryId = value }
        if let value = try? values.decode(String.self, forKey: .sort), ["next", "name", "cost"].contains(value) { sort = value }
        if let value = try? values.decode(String.self, forKey: .group), ["none", "category", "period", "currency"].contains(value) { group = value }
    }

    public func apply(_ rows: [SubscriptionRow], search: String) -> [SubscriptionRow] {
        rows.filter { row in
            let statusMatches = status == "all" || (status == "active" ? row.status.isCurrent : row.status.rawValue == status)
            let categoryMatches = categoryId == nil || row.subscription.categoryId == categoryId
            let query = search.trimmingCharacters(in: .whitespacesAndNewlines)
            return statusMatches && categoryMatches && (query.isEmpty || row.subscription.name.localizedStandardContains(query) || row.category?.name.localizedStandardContains(query) == true)
        }.sorted { left, right in
            switch sort {
            case "name": return left.subscription.name.localizedStandardCompare(right.subscription.name) == .orderedAscending
            case "cost": return left.monthly == right.monthly ? left.id < right.id : left.monthly > right.monthly
            default: return (left.nextDate ?? .distantFuture, left.id) < (right.nextDate ?? .distantFuture, right.id)
            }
        }
    }
}

public struct CalendarOptions: Codable, Equatable, Sendable {
    public var weekStart = "monday"
    public var showDayTotals = true
    public init() {}
    private enum CodingKeys: String, CodingKey { case weekStart, showDayTotals }
    public init(from decoder: Decoder) throws {
        self.init()
        guard let values = try? decoder.container(keyedBy: CodingKeys.self) else { return }
        if let value = try? values.decode(String.self, forKey: .weekStart), ["monday", "sunday"].contains(value) { weekStart = value }
        showDayTotals = (try? values.decode(Bool.self, forKey: .showDayTotals)) ?? true
    }
}
