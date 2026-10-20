import Foundation
import SubEyeCore

enum NativeTesting {
    static var reminderPromptEnabled: Bool { enabled && ProcessInfo.processInfo.arguments.contains("--test-reminder-prompt") }
    static var largestText: Bool { enabled && ProcessInfo.processInfo.arguments.contains("--largest-text") }
    static var publishWidgetFixture: Bool { enabled && ProcessInfo.processInfo.arguments.contains("--publish-widget-fixture") }
    static var enabled: Bool {
        #if NATIVE_DEVELOPMENT
        ProcessInfo.processInfo.arguments.contains("--ui-testing")
        #else
        false
        #endif
    }
    static func directory(_ base: URL) -> URL {
        guard enabled, let id = argument("--test-store"), UUID(uuidString: id) != nil else { return base }
        return base.appendingPathComponent("tests", isDirectory: true).appendingPathComponent(id, isDirectory: true)
    }
    static func seed(_ repository: SubscriptionRepository) async throws {
        #if NATIVE_DEVELOPMENT
        guard enabled, try await repository.setting("test.seeded", as: Bool.self) != true else { return }
        let count = min(10_000, max(0, Int(argument("--fixture-count") ?? "0") ?? 0))
        let fixtures = fixtures(count: count, brands: ProcessInfo.processInfo.arguments.contains("--fixture-brands"))
        if count > 0 { try await repository.importArchive(JSONCodec.encode(StoreDocument(preferences: .init(currency: "usd", timezone: TimeZone.current.identifier), subscriptions: fixtures.subscriptions, phases: fixtures.phases))) }
        try await repository.setSetting("pro.entitled", value: ProcessInfo.processInfo.arguments.contains("--fixture-pro"))
        try await repository.setSetting("test.seeded", value: true)
        #endif
    }
    #if NATIVE_DEVELOPMENT
    static func fixtures(count: Int, brands: Bool) -> (subscriptions: [Subscription], phases: [PricePhase]) {
        let now = Date(), today = Day.today()
        let names = ["Netflix", "Spotify", "YouTube Premium", "iCloud+", "Adobe Creative Cloud", "Дуже довга назва підписки для перевірки доступності"]
        var subscriptions: [Subscription] = [], phases: [PricePhase] = []
        for index in 0..<count {
            let id = "fixture-" + String(index)
            let anchor = Day.shift(today, days: index % 28)
            subscriptions.append(Subscription(id: id, name: names[index % names.count] + " " + String(index), cost: String(5 + index % 50), currency: index % 2 == 0 ? "usd" : "uah", paymentDate: Day.iso(anchor), now: now))
            if brands { subscriptions[subscriptions.count - 1].brandDomain = index % 2 == 0 ? "netflix.com" : "spotify.com" }
            for history in 1...6 {
                let start = Day.month(today, offset: -history)
                phases.append(PricePhase(id: id + "-phase-" + String(history), subscriptionId: id, kind: .standard, cost: String(history + 5), currency: subscriptions.last!.currency, startsAt: Day.iso(start), endsAt: Day.iso(Day.month(start, offset: 1)), appliedAt: Day.iso(now), now: now))
            }
        }
        return (subscriptions, phases)
    }

    // An archive import also writes `prefs`; carrying the current ones keeps the preferred currency and time zone.
    static func addFixtures(_ count: Int, to repository: SubscriptionRepository) async throws {
        let fixtures = fixtures(count: count, brands: true)
        try await repository.importArchive(JSONCodec.encode(StoreDocument(preferences: repository.document().preferences, subscriptions: fixtures.subscriptions, phases: fixtures.phases)))
    }

    // Anchors sit in the past so the calendar, year view and month-over-month totals have history behind today.
    static func seedPortfolio(_ repository: SubscriptionRepository) async throws {
        let now = Date(), today = Day.today()
        let document = try await repository.document()
        for subscription in document.subscriptions where subscription.id.hasPrefix("demo-") { try await repository.deleteSubscription(id: subscription.id) }
        let categories = [Category(id: "demo-entertainment", name: "Entertainment", emoji: "🎬", now: now),
                          Category(id: "demo-work", name: "Work", emoji: "💼", now: now),
                          Category(id: "demo-health", name: "Health", emoji: "🧘", now: now),
                          Category(id: "demo-cloud", name: "Cloud", emoji: "☁️", now: now),
                          Category(id: "demo-learning", name: "Learning", emoji: "📚", now: now)]
        func subscription(_ id: String, _ name: String, _ cost: String, _ currency: String = "usd", every: Int = 1, period: BillingPeriod = .month,
                          dueIn days: Int, category: String? = nil, domain: String? = nil) -> Subscription {
            let next = Day.shift(today, days: days)
            let anchor = switch period {
            case .day: Day.shift(next, days: -30 * every)
            case .week: Day.shift(next, days: -56 * every)
            case .month: Day.utc.date(byAdding: .month, value: -6 * every, to: next)!
            case .year: Day.utc.date(byAdding: .year, value: -every, to: next)!
            }
            var value = Subscription(id: "demo-" + id, name: name, cost: cost, currency: currency, every: every, period: period, paymentDate: Day.iso(anchor), now: now,
                                     categoryId: category.map { "demo-" + $0 }, brandDomain: domain)
            value.createdAt = Day.iso(Day.utc.date(byAdding: .month, value: -10, to: today)!)
            return value
        }
        func phase(_ subscription: Subscription, _ kind: PhaseKind, _ cost: String, from start: Date, to end: Date? = nil, applied: Bool = true) -> PricePhase {
            PricePhase(id: subscription.id + "-" + kind.rawValue + "-" + Day.key(start), subscriptionId: subscription.id, kind: kind, cost: cost, currency: subscription.currency,
                       startsAt: Day.iso(start), endsAt: end.map(Day.iso), appliedAt: applied ? Day.iso(start) : nil, now: now)
        }
        func months(_ offset: Int, from day: Date = today) -> Date { Day.utc.date(byAdding: .month, value: offset, to: day)! }

        var netflix = subscription("netflix", "Netflix", "12.99", dueIn: 1, category: "entertainment", domain: "netflix.com")
        netflix.notes = "Family plan, split four ways. Trial, then an introductory price, then the standard price."
        let adobe = subscription("adobe", "Adobe Creative Cloud", "29.99", dueIn: 1, category: "work", domain: "adobe.com")
        let spotify = subscription("spotify", "Spotify", "10.99", "eur", dueIn: 1, category: "entertainment", domain: "spotify.com")
        let icloud = subscription("icloud", "iCloud+", "2.99", dueIn: 0, category: "cloud", domain: "icloud.com")
        let hellofresh = subscription("hellofresh", "HelloFresh", "39.99", "eur", every: 2, period: .week, dueIn: 3, category: "health", domain: "hellofresh.com")
        let notion = subscription("notion", "Notion", "96", period: .year, dueIn: 9, category: "work", domain: "notion.so")
        let duolingo = subscription("duolingo", "Duolingo", "1499", "uah", every: 3, dueIn: 12, category: "learning", domain: "duolingo.com")
        let local = subscription("local", "Дуже довга назва підписки, щоб перевірити перенесення рядків", "249", "uah", dueIn: 16)
        let youtube = subscription("youtube", "YouTube Premium", "12.99", "gbp", dueIn: 22, category: "entertainment", domain: "youtube.com")
        let chatgpt = subscription("chatgpt", "ChatGPT Plus", "20", dueIn: 26, category: "work", domain: "openai.com")
        var disney = subscription("disney", "Disney+", "0", dueIn: 4, category: "entertainment", domain: "disneyplus.com")
        disney.paymentDate = Day.iso(Day.shift(today, days: 4))
        var nytimes = subscription("nytimes", "The New York Times", "9.99", dueIn: 5, domain: "nytimes.com")
        nytimes.willBeCancelledAt = Day.iso(Day.shift(today, days: 5)); nytimes.status = .cancelling
        var strava = subscription("strava", "Strava", "11.99", dueIn: 10, category: "health", domain: "strava.com")
        strava.pausedAt = Day.iso(Day.shift(today, days: -20)); strava.resumeAt = Day.iso(Day.shift(today, days: 10)); strava.status = .paused
        var headspace = subscription("headspace", "Headspace", "12.99", dueIn: -95, category: "health", domain: "headspace.com")
        headspace.willBeCancelledAt = Day.iso(months(-3)); headspace.status = .cancelled

        let trial = months(-6, from: Day.shift(today, days: 1))
        let phases = [
            phase(netflix, .trial, "0", from: trial, to: months(1, from: trial)),
            phase(netflix, .intro, "4.99", from: months(1, from: trial), to: months(3, from: trial)),
            phase(netflix, .standard, "12.99", from: months(3, from: trial)),
            phase(adobe, .standard, "29.99", from: months(-6, from: Day.shift(today, days: 1))),
            phase(adobe, .scheduledChange, "34.99", from: months(1, from: Day.shift(today, days: 1)), applied: false),
            phase(chatgpt, .standard, "16", from: months(-6, from: Day.shift(today, days: 26)), to: months(-2, from: Day.shift(today, days: 26))),
            phase(chatgpt, .scheduledChange, "20", from: months(-2, from: Day.shift(today, days: 26))),
            phase(disney, .trial, "0", from: Day.shift(today, days: -3), to: Day.shift(today, days: 4)),
            phase(disney, .standard, "9.99", from: Day.shift(today, days: 4), applied: false),
        ]
        try await repository.importArchive(JSONCodec.encode(StoreDocument(preferences: document.preferences, categories: categories,
            subscriptions: [netflix, adobe, spotify, icloud, hellofresh, notion, duolingo, local, youtube, chatgpt, disney, nytimes, strava, headspace], phases: phases)))
        try await repository.setSetting(DeveloperOverride.pro, value: true)
    }

    static func clearDeveloperData(_ repository: SubscriptionRepository) async throws {
        let document = try await repository.document()
        for subscription in document.subscriptions where ["developer-", "demo-", "fixture-"].contains(where: { subscription.id.hasPrefix($0) }) {
            try await repository.deleteSubscription(id: subscription.id)
        }
        for category in document.categories where category.id.hasPrefix("demo-") { try await repository.deleteCategory(id: category.id, now: Date()) }
        try await repository.setSetting(DeveloperOverride.pro, value: nil as Bool?)
    }

    static func empty(_ repository: SubscriptionRepository) async throws {
        let document = try await repository.document()
        for subscription in document.subscriptions { try await repository.deleteSubscription(id: subscription.id) }
        for category in document.categories { try await repository.deleteCategory(id: category.id, now: Date()) }
    }
    #endif
    private static func argument(_ key: String) -> String? {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: key), index + 1 < args.count else { return nil }
        return args[index + 1]
    }
}
