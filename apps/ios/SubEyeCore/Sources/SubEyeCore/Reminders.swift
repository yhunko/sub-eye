import Foundation

public struct ReminderSettings: Codable, Equatable, Sendable {
    public var renewals = false
    public var renewalLeadDays = [1]
    public var trials = false
    public var trialLeadDays = [1, 3]
    public var hour = 9
    public var minute = 0
    public init() {}
    private enum CodingKeys: String, CodingKey { case renewals, renewalLeadDays, trials, trialLeadDays, hour, minute }
    public init(from decoder: Decoder) throws {
        self.init()
        guard let values = try? decoder.container(keyedBy: CodingKeys.self) else { return }
        renewals = (try? values.decode(Bool.self, forKey: .renewals)) ?? false
        trials = (try? values.decode(Bool.self, forKey: .trials)) ?? false
        renewalLeadDays = Self.leads((try? values.decode([Int].self, forKey: .renewalLeadDays)) ?? [1], fallback: [1])
        trialLeadDays = Self.leads((try? values.decode([Int].self, forKey: .trialLeadDays)) ?? [1, 3], fallback: [1, 3])
        let storedHour = (try? values.decode(Int.self, forKey: .hour)) ?? 9
        let storedMinute = (try? values.decode(Int.self, forKey: .minute)) ?? 0
        hour = (0...23).contains(storedHour) ? storedHour : 9
        minute = (0...59).contains(storedMinute) ? storedMinute : 0
    }

    public func effective(pro: Bool) -> ReminderSettings {
        var value = self
        value.hour = (0...23).contains(hour) ? hour : 9
        value.minute = (0...59).contains(minute) ? minute : 0
        value.renewalLeadDays = Self.leads(renewalLeadDays, fallback: [1])
        value.trialLeadDays = Self.leads(trialLeadDays, fallback: [1, 3])
        if !pro { value.trials = false; value.renewalLeadDays = [1]; value.trialLeadDays = [1] }
        return value
    }
    public static func leads(_ values: [Int], fallback: [Int]) -> [Int] {
        let kept = Set(values).filter { [0, 1, 3, 7].contains($0) }.sorted()
        return kept.isEmpty ? fallback : kept
    }
}

public struct RepeatRule: Codable, Equatable, Hashable, Sendable {
    public var hour: Int
    public var minute: Int
    public var weekday: Int?
    public var day: Int?
    public var month: Int?
    public var components: DateComponents { DateComponents(month: month, day: day, hour: hour, minute: minute, weekday: weekday) }
}

public struct PlannedReminder: Sendable, Identifiable {
    public var id: String
    public var fireAt: Date
    public var repeatRule: RepeatRule?
    public var kind: String
    public var events: [CalendarEvent]
    public var lead: Int
}

public enum ReminderPlanner {
    public static let budget = 56

    public static func repeatRule(_ row: SubscriptionRow, lead: Int, hour: Int, minute: Int, now: Date, zone: TimeZone = .current) -> RepeatRule? {
        guard row.status == .active, row.upcoming == nil, row.subscription.every == 1,
              row.effectiveKind != .trial, let next = row.nextDate,
              let anchor = Day.parse(row.subscription.paymentDate) else { return nil }
        let fire = Day.shift(next, days: -lead)
        var result = RepeatRule(hour: hour, minute: minute)
        switch row.subscription.period {
        case .day: break
        case .week: result.weekday = Day.utc.component(.weekday, from: fire)
        case .month:
            guard Day.utc.component(.day, from: anchor) <= 28 else { return nil }
            let day = Day.utc.component(.day, from: next) - lead
            guard (1...28).contains(day) else { return nil }; result.day = day
        case .year:
            let anchorMonth = Day.utc.component(.month, from: anchor), anchorDay = Day.utc.component(.day, from: anchor)
            guard !(anchorMonth == 2 && anchorDay == 29), !(anchorMonth == 3 && anchorDay <= lead) else { return nil }
            result.day = Day.utc.component(.day, from: fire); result.month = Day.utc.component(.month, from: fire)
            guard result.day != 29 || result.month != 2 else { return nil }
        }
        if anchor > Day.today(now, zone: zone) {
            var calendar = Calendar(identifier: .gregorian); calendar.timeZone = zone
            let firstAllowed = Day.localInstant(Day.shift(anchor, days: -lead), hour: hour, minute: minute, zone: zone)
            guard let first = calendar.nextDate(after: now, matching: result.components, matchingPolicy: .nextTime), first >= firstAllowed else { return nil }
        }
        return result
    }

    public static func plan(rows: [SubscriptionRow], settings: ReminderSettings, pro: Bool, rates: ExchangeRates,
                            currency: String, now: Date, zone: TimeZone, limit: Int = budget) -> [PlannedReminder] {
        let settings = settings.effective(pro: pro)
        var groups: [String: PlannedReminder] = [:]
        func collect(_ row: SubscriptionRow, events: [CalendarEvent], leads: [Int], kind: String, repeats: Bool) {
            for lead in leads {
                let rule = repeats ? repeatRule(row, lead: lead, hour: settings.hour, minute: settings.minute, now: now, zone: zone) : nil
                for event in events {
                    let fire = Day.localInstant(Day.shift(event.date, days: -lead), hour: settings.hour, minute: settings.minute, zone: zone)
                    guard fire > now else { continue }
                    let key = kind + ":" + (rule.flatMap { try? JSONCodec.string($0) } ?? Day.iso(fire))
                    if var group = groups[key] {
                        if !group.events.contains(where: { $0.subscriptionId == event.subscriptionId }) { group.events.append(event) }
                        groups[key] = group
                    } else {
                        groups[key] = PlannedReminder(id: key, fireAt: fire, repeatRule: rule, kind: kind, events: [event], lead: lead)
                    }
                    if rule != nil { break }
                }
            }
        }
        for row in rows where row.status.isCurrent {
            if settings.renewals, let next = row.nextDate {
                let end = Recurrence.occurrence(anchor: next, every: row.subscription.every, period: row.subscription.period, index: 2)
                let events = Array(Projection.payments([row], from: next, through: end, rates: rates, currency: currency).prefix(3))
                collect(row, events: events, leads: settings.renewalLeadDays, kind: "renewal", repeats: true)
            }
            if settings.trials, let trial = Pricing.effective(row.phases, at: now), trial.kind == .trial,
               let end = Day.parse(trial.endsAt), Lifecycle.includes(row.subscription, occurrence: end) {
                let amount = row.upcoming.map { rates.convert(Double($0.cost) ?? 0, from: $0.currency, to: currency) } ?? 0
                let event = CalendarEvent(subscriptionId: row.id, name: row.subscription.name, domain: row.subscription.brandDomain,
                                          kind: .trialEnds, date: end, amount: amount)
                collect(row, events: [event], leads: settings.trialLeadDays, kind: "trial", repeats: false)
            }
        }
        return Array(groups.values.sorted {
            if ($0.repeatRule != nil) != ($1.repeatRule != nil) { return $0.repeatRule != nil }
            return $0.fireAt == $1.fireAt ? $0.id < $1.id : $0.fireAt < $1.fireAt
        }.prefix(limit))
    }
}
