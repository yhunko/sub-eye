import ActivityKit
import Foundation
import SubEyeCore

enum LiveActivitySupport {
    // Scheduling lets the activity appear at 9:00 on its own; before iOS 26 an app may only start one while it is open.
    case unavailable, onOpen, scheduled
}

#if NATIVE_DEVELOPMENT
enum LiveActivityPreviewScenario {
    case single, multiple, hidden
}
#endif

@MainActor
final class LiveActivityService {
    private let repository: SubscriptionRepository
    private var generation = 0
    init(repository: SubscriptionRepository) { self.repository = repository }
    var authorized: Bool { ActivityAuthorizationInfo().areActivitiesEnabled }
    static var support: LiveActivitySupport {
        if #available(iOS 26, *) { return .scheduled }
        if #available(iOS 17, *) { return .onOpen }
        return .unavailable
    }
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
            await release(activity.attributes.day)
        }
    }
    // "" marks an activity the app ended itself, which may start again; a user-removed one keeps its id and stays gone.
    private func release(_ day: String) async {
        guard (try? await repository.setting("live.requested." + day, as: String.self)) != nil else { return }
        try? await repository.setSetting("live.requested." + day, value: "")
    }
    func synchronize(model: Presentation, rates: ExchangeRates, logos: LogoService) async throws {
        generation += 1; let current = generation
        guard try await repository.setting("live.enabled", as: Bool.self) == true else { await endAll(); await logos.retainActivityLogos([]); return }
        guard Self.support != .unavailable, authorized else { await endAll(); return }
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
        let events = Self.renewalEvents(try await repository.calendar(from: from, through: through, rates: rates, now: now))
        let groups = Dictionary(grouping: events) { Day.key($0.date) }
        guard current == generation, !Task.isCancelled else { return }
        var planned: [(String, Date, RenewalActivity.ContentState)] = []
        for day in groups.keys.sorted() {
            if Self.support == .onOpen, day != Day.key(today) { continue }
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
            if activity.content.state.preview == true { continue }
            if !planned.contains(where: { $0.0 == activity.attributes.day }) {
                await activity.end(nil, dismissalPolicy: .immediate); await release(activity.attributes.day)
            }
        }
        for (day, start, state) in planned {
            try Task.checkCancellation()
            guard current == generation else { return }
            guard try await repository.setting("live.enabled", as: Bool.self) == true else { await endAll(); return }
            guard current == generation, try await repository.setting("live.ack." + day, as: String.self) == nil else { continue }
            let content = ActivityContent(state: state, staleDate: state.expiresAt)
            if let existing = Activity<RenewalActivity>.activities.first(where: { $0.attributes.day == day && $0.content.state.preview != true }) {
                if existing.content.state != state { await Self.update(day: day, content: content) }
            } else if start > now, #available(iOS 26, *) {
                let activity = try Activity.request(attributes: RenewalActivity(day: day), content: content, pushType: nil, style: .standard,
                                                    alertConfiguration: Self.alert(state), start: start)
                try await repository.setSetting("live.requested." + day, value: activity.id)
            } else if try await repository.setting("live.requested." + day, as: String.self)?.isEmpty == false {
                // Started and since removed by the user; requesting again would resurrect it on every foreground.
                try await repository.acknowledgeRenewal(day: day, now: now)
            } else {
                let activity = try Activity.request(attributes: RenewalActivity(day: day), content: content, pushType: nil)
                try await repository.setSetting("live.requested." + day, value: activity.id)
            }
        }
        if current == generation, !Task.isCancelled {
            let previewFiles = Activity<RenewalActivity>.activities.filter { $0.content.state.preview == true }.flatMap { $0.content.state.items.compactMap(\.logoFile) }
            await logos.retainActivityLogos(Set(planned.flatMap { $0.2.items.compactMap(\.logoFile) } + previewFiles))
        }
    }
    // A plan payment has nothing to keep or cancel, and its id names no subscription for the activity's Cancel sheet.
    static func renewalEvents(_ events: [CalendarEvent]) -> [CalendarEvent] { events.filter { $0.kind == .payment && $0.installment == nil } }
    static func alert(_ state: RenewalActivity.ContentState) -> AlertConfiguration {
        let today = L("notif_whenToday")
        let title: String, body: String
        if state.count == 1, let item = state.items.first {
            title = L("notif_renewalTitle", ["name": item.name, "when": today])
            body = L("notif_renewalBody", ["amount": item.price])
        } else {
            let shown = state.items.map(\.name).joined(separator: ", ")
            let names = state.count > state.items.count ? L("notif_digestMore", ["names": shown, "count": String(state.count - state.items.count)]) : shown
            title = L("notif_renewalDigestTitle", ["when": today])
            body = L("notif_digestBody", ["names": names, "amount": state.total])
        }
        return AlertConfiguration(title: LocalizedStringResource(String.LocalizationValue(title)),
                                  body: LocalizedStringResource(String.LocalizationValue(body)), sound: .default)
    }
    private nonisolated static func update(day: String, content: ActivityContent<RenewalActivity.ContentState>) async {
        if let activity = Activity<RenewalActivity>.activities.first(where: { $0.attributes.day == day && $0.content.state.preview != true }) {
            await activity.update(content)
        }
    }

    #if NATIVE_DEVELOPMENT
    var previewCount: Int {
        Activity<RenewalActivity>.activities.filter { $0.content.state.preview == true || $0.attributes.day == "developer-preview" }.count
    }

    func showPreview(_ scenario: LiveActivityPreviewScenario, model: Presentation, logos: LogoService) async throws {
        let current = model.rows.filter { $0.status.isCurrent && $0.nextDate != nil && $0.nextAmount != nil }
        let groups = Dictionary(grouping: current) { Day.key($0.nextDate!) }
        let preferred = groups.values.first { rows in
            let ids = Set(rows.map(\.id)); return ids.contains("demo-streaming") && ids.contains("demo-design")
        }
        let grouped = preferred ?? groups.values.filter { $0.count > 1 }.max { $0.count < $1.count }
        let rows: [SubscriptionRow]
        let hidden: Bool
        switch scenario {
        case .single:
            guard let row = current.first(where: { $0.id == "demo-streaming" }) ?? current.first else {
                throw DomainError.invalidDocument("Add a current subscription or seed the timeline demo first")
            }
            rows = [row]; hidden = false
        case .multiple:
            guard let grouped else { throw DomainError.invalidDocument("Seed the timeline demo to preview grouped renewals") }
            rows = grouped; hidden = false
        case .hidden:
            rows = []; hidden = true
        }
        let day = rows.first?.nextDate.map(Day.key) ?? Day.key(Day.shift(Day.today(), days: 1))
        var items: [RenewalActivity.Item] = []
        for row in rows.prefix(2) {
            let filename = if let domain = row.subscription.brandDomain { await logos.activityLogo(domain: domain) } else { String?.none }
            items.append(.init(id: row.id, name: String(row.subscription.name.prefix(64)),
                               price: Display.money(row.nextAmount ?? row.amount, model.preferences.preferredCurrency), logoFile: filename))
        }
        let total = Display.money(rows.reduce(0) { $0 + ($1.nextAmount ?? $1.amount) }, model.preferences.preferredCurrency)
        UserDefaults(suiteName: AppConfiguration.group)?.set(true, forKey: AppConfiguration.namespace + ".live.enabled")
        for activity in Activity<RenewalActivity>.activities where activity.content.state.preview == true || activity.attributes.day == "developer-preview" {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        let state = RenewalActivity.ContentState(items: items, count: rows.count, total: hidden ? "" : total,
                                                 expiresAt: Date().addingTimeInterval(3600), hidden: hidden, preview: true)
        let content = ActivityContent(state: state, staleDate: state.expiresAt)
        _ = try Activity.request(attributes: RenewalActivity(day: day), content: content, pushType: nil)
        let retained = Activity<RenewalActivity>.activities.flatMap { $0.content.state.items.compactMap(\.logoFile) }
        await logos.retainActivityLogos(Set(retained))
    }

    func endPreview() async throws {
        for activity in Activity<RenewalActivity>.activities where activity.content.state.preview == true || activity.attributes.day == "developer-preview" {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        let enabled = try await repository.setting("live.enabled", as: Bool.self) == true
        UserDefaults(suiteName: AppConfiguration.group)?.set(enabled, forKey: AppConfiguration.namespace + ".live.enabled")
    }
    #endif
}
