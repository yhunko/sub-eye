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
        var preview: Bool? = nil
        // A layout change must refresh ActivityKit's cached presentation after an app upgrade.
        var layoutVersion: Int? = 4
    }
    var day: String
}

// ActivityKit may refuse to start an activity whose image is larger than its smallest presentation (the 36.67 pt
// minimal Dynamic Island). 108 px read at 3× is 36 pt, which still leaves enough pixels for the 44 pt Lock Screen logo.
enum LiveActivityLogo {
    static let pixels = 108
    static let scale: CGFloat = 3
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
