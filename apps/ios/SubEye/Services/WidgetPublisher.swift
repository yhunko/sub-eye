import Foundation
import CryptoKit
import WidgetKit
import SubEyeCore

actor WidgetPublisher {
    private let group: String
    private let key: String
    private let logoDirectory: URL?
    private let reloadTimelines: Bool
    init(group: String = AppConfiguration.group, key: String = AppConfiguration.widgetKey, logoDirectory: URL? = nil, reloadTimelines: Bool = true) {
        self.group = group; self.key = key; self.logoDirectory = logoDirectory; self.reloadTimelines = reloadTimelines
    }
    func publish(_ model: Presentation, pro: Bool, logos: LogoService) async throws {
        let currency = model.preferences.preferredCurrency
        let difference = model.dashboard.monthTotal - model.dashboard.previousMonth
        let renewals = model.rows.filter { $0.nextDate != nil && $0.nextAmount != nil && $0.status.isCurrent }.map { row in
            (date: row.nextDate!, item: WidgetItem(id: row.id, name: row.subscription.name, domain: row.subscription.brandDomain,
                                                  amount: Display.money(row.nextAmount ?? row.amount, currency), date: Day.iso(row.nextDate!)))
        }
        let plans = (model.installments ?? []).compactMap { row -> (date: Date, item: WidgetItem)? in
            guard !row.finished, let date = row.nextDate, let amount = row.nextConverted else { return nil }
            return (date, WidgetItem(id: row.id, name: row.plan.name, domain: row.plan.lenderDomain, amount: Display.money(amount, currency), date: Day.iso(date),
                                     link: "installments/" + row.id, symbol: row.plan.symbol, tint: row.plan.tint))
        }
        let next = (renewals + plans).sorted { $0.date < $1.date }
        var items: [WidgetItem] = []
        let directory = try logoDirectory ?? AppConfiguration.directory.appendingPathComponent("widget-logos")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        if pro {
            for entry in next.prefix(3) {
                var item = entry.item
                if let domain = item.domain,
                   let payload = await logos.cached(domain: domain, variant: logos.variant(for: domain)), let bytes = payload.bytes {
                    let filename = SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined() + ".png"
                    let url = directory.appendingPathComponent(filename)
                    if !FileManager.default.fileExists(atPath: url.path) { try bytes.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]) }
                    item.logoFile = filename
                }
                items.append(item)
            }
        }
        let kept = Set(items.compactMap(\.logoFile))
        for file in try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) where !kept.contains(file.lastPathComponent) { try? FileManager.default.removeItem(at: file) }
        let alsoDue = next.first.map { first in next.dropFirst().filter { $0.date == first.date }.count } ?? 0
        let snapshot = WidgetSnapshot(locked: !pro, lockTitle: L("native_widgetPro"), lockCta: L("paywall_unlock"), monthLabel: L("widget_thisMonth"), monthTotal: Display.money(model.dashboard.monthTotal, currency), upcomingLabel: L("widget_upcoming"), emptyLabel: L("widget_nothingDue"), delta: pro && model.dashboard.previousMonth > 0 ? Display.money(abs(difference), currency) : nil, deltaLabel: L("widget_vsLastMonth"), deltaUp: difference > 0, alsoDue: pro && alsoDue > 0 ? L("widget_alsoDue", ["count": String(alsoDue)]) : nil, locale: Bundle.main.preferredLocalizations.first, items: items)
        let raw = try JSONCodec.string(snapshot)
        let defaults = UserDefaults(suiteName: group)
        guard defaults?.string(forKey: key) != raw else { return }
        defaults?.set(raw, forKey: key)
        if reloadTimelines { WidgetCenter.shared.reloadTimelines(ofKind: "SubEyeWidget") }
    }
    func erase() {
        UserDefaults(suiteName: group)?.removeObject(forKey: key)
        if reloadTimelines { WidgetCenter.shared.reloadTimelines(ofKind: "SubEyeWidget") }
        if let directory = try? logoDirectory ?? AppConfiguration.directory.appendingPathComponent("widget-logos") { try? FileManager.default.removeItem(at: directory) }
    }
}
