import Foundation
import SubEyeCore

struct WidgetSnapshot: Codable, Sendable {
    var v = 1
    var locked: Bool
    var lockTitle: String
    var lockCta: String
    var monthLabel: String
    var monthTotal: String
    var upcomingLabel: String
    var emptyLabel: String
    var delta: String?
    var deltaLabel: String
    var deltaUp: Bool
    var alsoDue: String?
    var locale: String?
    var items: [WidgetItem]
    static func read(group: String = AppConfiguration.group, key: String = AppConfiguration.widgetKey) -> WidgetSnapshot? {
        guard let raw = UserDefaults(suiteName: group)?.string(forKey: key), raw.utf8.count < 50_000,
              let snapshot = try? JSONCodec.decode(Self.self, Data(raw.utf8)), snapshot.v == 1 else { return nil }
        return snapshot
    }
}

struct WidgetItem: Codable, Identifiable, Sendable {
    var id: String
    var name: String
    var domain: String?
    var amount: String
    var date: String
    var logoFile: String? = nil
    var logoURL: URL? {
        guard let logoFile, logoFile.range(of: "^[a-f0-9]{64}\\.png$", options: .regularExpression) != nil else { return nil }
        return try? AppConfiguration.directory.appendingPathComponent("widget-logos").appendingPathComponent(logoFile)
    }
    func dueText(locale: String?) -> String {
        let formatter = RelativeDateTimeFormatter(); formatter.dateTimeStyle = .named
        formatter.locale = locale.map(Locale.init(identifier:)) ?? .current
        return formatter.localizedString(from: DateComponents(day: Day.distance(Day.today(), Day.parse(date) ?? Day.today())))
    }
}
