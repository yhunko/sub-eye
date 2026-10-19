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
        let now = Date(), today = Day.today()
        let names = ["Netflix", "Spotify", "YouTube Premium", "iCloud+", "Adobe Creative Cloud", "Дуже довга назва підписки для перевірки доступності"]
        var subscriptions: [Subscription] = [], phases: [PricePhase] = []
        for index in 0..<count {
            let id = "fixture-" + String(index)
            let anchor = Day.shift(today, days: index % 28)
            subscriptions.append(Subscription(id: id, name: names[index % names.count] + " " + String(index), cost: String(5 + index % 50), currency: index % 2 == 0 ? "usd" : "uah", paymentDate: Day.iso(anchor), now: now))
            if ProcessInfo.processInfo.arguments.contains("--fixture-brands") {
                subscriptions[subscriptions.count - 1].brandDomain = index % 2 == 0 ? "netflix.com" : "spotify.com"
            }
            for history in 1...6 {
                let start = Day.month(today, offset: -history)
                phases.append(PricePhase(id: id + "-phase-" + String(history), subscriptionId: id, kind: .standard, cost: String(history + 5), currency: subscriptions.last!.currency, startsAt: Day.iso(start), endsAt: Day.iso(Day.month(start, offset: 1)), appliedAt: Day.iso(now), now: now))
            }
        }
        if count > 0 { try await repository.importArchive(JSONCodec.encode(StoreDocument(preferences: .init(currency: "usd", timezone: TimeZone.current.identifier), subscriptions: subscriptions, phases: phases))) }
        try await repository.setSetting("pro.entitled", value: ProcessInfo.processInfo.arguments.contains("--fixture-pro"))
        try await repository.setSetting("test.seeded", value: true)
        #endif
    }
    #if NATIVE_DEVELOPMENT
    static func seedDemo(_ repository: SubscriptionRepository) async throws {
        let now = Date(), today = Day.today()
        func subscription(_ id: String, _ name: String, _ cost: String, dueIn days: Int,
                          domain: String) -> Subscription {
            Subscription(id: id, name: name, cost: cost, currency: "usd",
                         paymentDate: Day.iso(Day.shift(today, days: days)), now: now, brandDomain: domain)
        }
        func phase(_ id: String, subscriptionId: String, kind: PhaseKind, cost: String,
                   start: Date, end: Date? = nil, applied: Bool = true) -> PricePhase {
            PricePhase(id: id, subscriptionId: subscriptionId, kind: kind, cost: cost, currency: "usd",
                       startsAt: Day.iso(start), endsAt: end.map(Day.iso),
                       appliedAt: applied ? Day.iso(start) : nil, now: now)
        }

        var streaming = subscription("demo-streaming", "Netflix", "12.99", dueIn: 1, domain: "netflix.com")
        streaming.notes = "Trial, introductory price, and standard price history."
        let trialStart = Day.month(today, offset: -3)
        let introStart = Day.month(today, offset: -2)
        let standardStart = Day.month(today, offset: -1)
        let streamingPhases = [
            phase("demo-streaming-trial", subscriptionId: streaming.id, kind: .trial, cost: "0", start: trialStart, end: introStart),
            phase("demo-streaming-intro", subscriptionId: streaming.id, kind: .intro, cost: "4.99", start: introStart, end: standardStart),
            phase("demo-streaming-standard", subscriptionId: streaming.id, kind: .standard, cost: "12.99", start: standardStart),
        ]

        let design = subscription("demo-design", "Adobe Creative Cloud", "29.99", dueIn: 1, domain: "adobe.com")
        let designPhases = [
            phase("demo-design-standard", subscriptionId: design.id, kind: .standard, cost: "29.99", start: Day.month(today, offset: -6)),
            phase("demo-design-change", subscriptionId: design.id, kind: .scheduledChange, cost: "34.99",
                  start: Day.month(today, offset: 1), applied: false),
        ]

        var cancelling = subscription("demo-cancelling", "The New York Times", "9.99", dueIn: 5, domain: "nytimes.com")
        cancelling.willBeCancelledAt = cancelling.paymentDate; cancelling.status = .cancelling
        var paused = subscription("demo-paused", "Strava", "11.99", dueIn: 3, domain: "strava.com")
        paused.pausedAt = Day.iso(today); paused.resumeAt = Day.iso(Day.shift(today, days: 10)); paused.status = .paused
        var cancelled = subscription("demo-cancelled", "Headspace", "12.99", dueIn: -3, domain: "headspace.com")
        cancelled.willBeCancelledAt = cancelled.paymentDate; cancelled.status = .cancelled

        let document = StoreDocument(
            preferences: Preferences(currency: "usd", timezone: TimeZone.current.identifier),
            subscriptions: [streaming, design, cancelling, paused, cancelled],
            phases: streamingPhases + designPhases + [
                phase("demo-cancelling-standard", subscriptionId: cancelling.id, kind: .standard, cost: cancelling.cost, start: Day.month(today, offset: -4)),
                phase("demo-paused-standard", subscriptionId: paused.id, kind: .standard, cost: paused.cost, start: Day.month(today, offset: -5)),
                phase("demo-cancelled-standard", subscriptionId: cancelled.id, kind: .standard, cost: cancelled.cost, start: Day.month(today, offset: -6)),
            ]
        )
        try await repository.importArchive(JSONCodec.encode(document))
        try await repository.setSetting("pro.entitled", value: true)
        try await repository.setSetting(DeveloperOverride.pro, value: true)
    }
    #endif
    private static func argument(_ key: String) -> String? {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: key), index + 1 < args.count else { return nil }
        return args[index + 1]
    }
}
