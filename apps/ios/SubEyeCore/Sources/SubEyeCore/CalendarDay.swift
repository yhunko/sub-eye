import Foundation

public enum Day {
    public static let utc: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        return calendar
    }()

    public static func parse(_ value: String?) -> Date? {
        guard let value else { return nil }
        if value.count == 10 {
            return try? Date.ISO8601FormatStyle().parse(value + "T00:00:00Z")
        }
        return (try? Date.ISO8601FormatStyle(includingFractionalSeconds: true).parse(value))
            ?? (try? Date.ISO8601FormatStyle().parse(value))
    }

    public static func iso(_ date: Date) -> String {
        date.formatted(.iso8601.year().month().day().dateSeparator(.dash)
            .time(includingFractionalSeconds: true).timeSeparator(.colon).timeZone(separator: .omitted))
    }
    public static func key(_ date: Date) -> String { String(iso(date).prefix(10)) }
    public static func floor(_ date: Date) -> Date { utc.startOfDay(for: date) }
    public static func today(_ now: Date, zone: TimeZone) -> Date {
        var local = utc; local.timeZone = zone
        return utc.date(from: local.dateComponents([.year, .month, .day], from: now))!
    }
    public static func shift(_ day: Date, days: Int) -> Date {
        utc.date(byAdding: .day, value: days, to: day)!
    }
    public static func monthStart(_ day: Date) -> Date {
        utc.date(from: utc.dateComponents([.year, .month], from: day))!
    }
    public static func month(_ day: Date, offset: Int) -> Date {
        utc.date(byAdding: .month, value: offset, to: monthStart(day))!
    }
    public static func yearStart(_ day: Date) -> Date {
        utc.date(from: utc.dateComponents([.year], from: day))!
    }
    public static func localInstant(_ day: Date, hour: Int, minute: Int, zone: TimeZone) -> Date {
        var calendar = utc; calendar.timeZone = zone
        var components = utc.dateComponents([.year, .month, .day], from: day)
        components.hour = hour; components.minute = minute; components.timeZone = zone
        return calendar.date(from: components)!
    }
    public static func distance(_ from: Date, _ to: Date) -> Int {
        utc.dateComponents([.day], from: floor(from), to: floor(to)).day ?? 0
    }
}

public enum Recurrence {
    public static func occurrence(anchor: Date, every: Int, period: BillingPeriod, index: Int) -> Date {
        let component: Calendar.Component
        let multiplier: Int
        switch period {
        case .day: component = .day; multiplier = 1
        case .week: component = .day; multiplier = 7
        case .month: component = .month; multiplier = 1
        case .year: component = .year; multiplier = 1
        }
        return Day.utc.date(byAdding: component, value: max(1, every) * index * multiplier, to: anchor)!
    }

    public static func nextIndex(anchor: Date, every: Int, period: BillingPeriod, onOrAfter day: Date) -> Int {
        guard anchor < day else { return 0 }
        let divisor = max(1, every)
        let difference: Int
        switch period {
        case .day: difference = Day.distance(anchor, day) / divisor
        case .week: difference = Day.distance(anchor, day) / (7 * divisor)
        case .month: difference = (Day.utc.dateComponents([.month], from: anchor, to: day).month ?? 0) / divisor
        case .year: difference = (Day.utc.dateComponents([.year], from: anchor, to: day).year ?? 0) / divisor
        }
        var index = max(0, difference)
        while occurrence(anchor: anchor, every: every, period: period, index: index) < day { index += 1 }
        return index
    }

    public static func next(_ subscription: Subscription, onOrAfter day: Date) -> Date? {
        guard let anchor = Day.parse(subscription.paymentDate), subscription.every > 0 else { return nil }
        return occurrence(anchor: anchor, every: subscription.every, period: subscription.period,
                          index: nextIndex(anchor: anchor, every: subscription.every, period: subscription.period, onOrAfter: day))
    }
}
