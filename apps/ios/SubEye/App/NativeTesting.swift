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
    private static func argument(_ key: String) -> String? {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: key), index + 1 < args.count else { return nil }
        return args[index + 1]
    }
}
