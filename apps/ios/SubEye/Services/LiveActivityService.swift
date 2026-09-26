import ActivityKit
import Foundation
import SubEyeCore

@MainActor
final class LiveActivityService {
    private let repository: SubscriptionRepository
    private var generation = 0
    init(repository: SubscriptionRepository) { self.repository = repository }
    var authorized: Bool { ActivityAuthorizationInfo().areActivitiesEnabled }
    func setEnabled(_ enabled: Bool) async throws {
        generation += 1
        if !enabled { UserDefaults(suiteName: AppConfiguration.group)?.set(false, forKey: AppConfiguration.namespace + ".live.enabled") }
        try await repository.setSetting("live.enabled", value: enabled)
        if enabled, !Task.isCancelled, try await repository.setting("live.enabled", as: Bool.self) == true {
            UserDefaults(suiteName: AppConfiguration.group)?.set(true, forKey: AppConfiguration.namespace + ".live.enabled")
        }
        if !enabled { await endAll() }
    }
    func endAll() async {
        for activity in Activity<RenewalActivity>.activities {
            var hidden = activity.content.state; hidden.items = []; hidden.total = ""; hidden.hidden = true
            await activity.end(ActivityContent(state: hidden, staleDate: Date()), dismissalPolicy: .immediate)
        }
    }
    func synchronize(model: Presentation, rates: ExchangeRates, logos: LogoService) async throws {
        generation += 1; let current = generation
        guard try await repository.setting("live.enabled", as: Bool.self) == true else { await endAll(); await logos.retainActivityLogos([]); return }
        guard #available(iOS 27, *), authorized else { await endAll(); return }
        let now = Date(), today = Day.today()
        let todayEnd = Day.localInstant(today, hour: 17, minute: 0, zone: .current)
        let from = now < todayEnd ? today : Day.shift(today, days: 1)
        var candidates = Set<Date>()
        for row in model.rows where row.status.isCurrent {
            var next = Recurrence.next(row.subscription, onOrAfter: from)
            for _ in 0..<3 {
                guard let date = next, Lifecycle.includes(row.subscription, occurrence: date) else { break }
                if !Lifecycle.isPaused(row.subscription, occurrence: date) { candidates.insert(date) }
                next = Recurrence.next(row.subscription, onOrAfter: Day.shift(date, days: 1))
            }
        }
        var days: [Date] = []
        for date in candidates.sorted() {
            if try await repository.setting("live.ack." + Day.key(date), as: String.self) == nil { days.append(date) }
            if days.count == 2 { break }
        }
        guard let through = days.last else { await endAll(); return }
        let events = try await repository.calendar(from: from, through: through, rates: rates, now: now).filter { $0.kind == .payment }
        let groups = Dictionary(grouping: events) { Day.key($0.date) }
        guard current == generation, !Task.isCancelled else { return }
        var planned: [(String, Date, RenewalActivity.ContentState)] = []
        for day in groups.keys.sorted() {
            if try await repository.setting("live.ack." + day, as: String.self) != nil { continue }
            let start = Day.localInstant(Day.parse(day)!, hour: 9, minute: 0, zone: .current)
            let end = start.addingTimeInterval(8 * 3600)
            guard end > now, let items = groups[day] else { continue }
            var visibleItems: [RenewalActivity.Item] = []
            for item in items.prefix(2) {
                let filename = if let domain = item.domain { await logos.activityLogo(domain: domain) } else { String?.none }
                visibleItems.append(.init(id: item.subscriptionId, name: String(item.name.prefix(64)), price: Display.money(item.amount, model.preferences.preferredCurrency), logoFile: filename))
            }
            let content = RenewalActivity.ContentState(items: visibleItems, count: items.count, total: Display.money(items.reduce(0) { $0 + $1.amount }, model.preferences.preferredCurrency), expiresAt: end)
            planned.append((day, start, content))
            // Pending activities count toward the system-wide activity limit.
            if planned.count == 2 { break }
        }
        for activity in Activity<RenewalActivity>.activities {
            guard current == generation, !Task.isCancelled else { return }
            if !planned.contains(where: { $0.0 == activity.attributes.day }) { await activity.end(nil, dismissalPolicy: .immediate) }
        }
        for (day, start, state) in planned {
            try Task.checkCancellation()
            guard current == generation else { return }
            guard try await repository.setting("live.enabled", as: Bool.self) == true else { await endAll(); return }
            guard current == generation, try await repository.setting("live.ack." + day, as: String.self) == nil else { continue }
            let content = ActivityContent(state: state, staleDate: state.expiresAt)
            if let existing = Activity<RenewalActivity>.activities.first(where: { $0.attributes.day == day }) {
                if existing.content.state != state { await Self.update(day: day, content: content) }
            } else if start > now {
                _ = try Activity.request(attributes: RenewalActivity(day: day), content: content, pushType: nil, style: .standard,
                                         alertConfiguration: AlertConfiguration(title: "native_liveDay", body: "native_open", sound: .default), start: start)
            } else {
                _ = try Activity.request(attributes: RenewalActivity(day: day), content: content, pushType: nil, style: .standard)
            }
        }
        if current == generation, !Task.isCancelled { await logos.retainActivityLogos(Set(planned.flatMap { $0.2.items.compactMap(\.logoFile) })) }
    }
    private nonisolated static func update(day: String, content: ActivityContent<RenewalActivity.ContentState>) async {
        if let activity = Activity<RenewalActivity>.activities.first(where: { $0.attributes.day == day }) {
            await activity.update(content)
        }
    }
}
