import ActivityKit
import AppIntents
import SubEyeCore

struct RenewalActivity: ActivityAttributes {
    struct Item: Codable, Hashable, Sendable {
        var id: String
        var name: String
        var price: String
        var logoFile: String? = nil
        var logoURL: URL? {
            guard let logoFile, logoFile.range(of: "^[a-f0-9]{64}\\.png$", options: .regularExpression) != nil else { return nil }
            return try? AppConfiguration.directory.appendingPathComponent("logos/live-activity").appendingPathComponent(logoFile)
        }
    }
    struct ContentState: Codable, Hashable, Sendable {
        var items: [Item]
        var count: Int
        var total: String
        var expiresAt: Date
        var hidden = false
        // A layout change must refresh ActivityKit's cached presentation after an app upgrade.
        var layoutVersion: Int? = 2
    }
    var day: String
}

struct KeepRenewalIntent: LiveActivityIntent {
    static var title: LocalizedStringResource { "native_keep" }
    static var description: IntentDescription { IntentDescription("native_keepHint") }
    static var openAppWhenRun: Bool { false }
    @Parameter(title: "native_date") var day: String
    init() { }
    init(day: String) { self.day = day }
    func perform() async throws -> some IntentResult {
        let repository = try AppConfiguration.repository()
        try await repository.acknowledgeRenewal(day: day, now: Date())
        for activity in Activity<RenewalActivity>.activities where activity.attributes.day == day {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        return .result()
    }
}

@available(iOS 18, *)
struct PlanCancellationIntent: LiveActivityIntent {
    static var title: LocalizedStringResource { "native_cancel" }
    static var description: IntentDescription { IntentDescription("native_cancelHint") }
    @Parameter(title: "form_name") var subscriptionId: String
    @Parameter(title: "native_date") var day: String
    init() { }
    init(subscriptionId: String, day: String) { self.subscriptionId = subscriptionId; self.day = day }
    func perform() async throws -> some IntentResult & OpensIntent {
        let repository = try AppConfiguration.repository()
        let enabled = try await repository.setting("live.enabled", as: Bool.self) == true
        var url = AppConfiguration.url("subscriptions")
        if enabled {
            url = AppConfiguration.url(subscriptionId.isEmpty ? "subscriptions/due/" + day : "subscriptions/" + subscriptionId)
            var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
            components.queryItems = [URLQueryItem(name: "action", value: "plan-cancellation")]; url = components.url!
        }
        return .result(opensIntent: OpenURLIntent(url))
    }
}

struct OpenSubEyeIntent: AppIntent {
    static var title: LocalizedStringResource { "native_open" }
    static var openAppWhenRun: Bool { true }
    func perform() async throws -> some IntentResult { .result() }
}

struct SubEyeShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: OpenSubEyeIntent(), phrases: ["Open \(.applicationName)"], shortTitle: "native_open", systemImageName: "repeat.circle")
    }
}
