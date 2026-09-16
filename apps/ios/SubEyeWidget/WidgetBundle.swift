import SwiftUI
import WidgetKit

struct SubscriptionEntry: TimelineEntry {
    var date: Date
    var snapshot: WidgetSnapshot?
}

struct SubscriptionProvider: TimelineProvider {
    func placeholder(in context: Context) -> SubscriptionEntry { SubscriptionEntry(date: Date(), snapshot: WidgetSnapshot.read()) }
    func getSnapshot(in context: Context, completion: @escaping (SubscriptionEntry) -> Void) { completion(SubscriptionEntry(date: Date(), snapshot: WidgetSnapshot.read())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<SubscriptionEntry>) -> Void) {
        let midnight = Calendar.current.nextDate(after: Date(), matching: DateComponents(hour: 0, minute: 0), matchingPolicy: .nextTime) ?? Date().addingTimeInterval(86_400)
        completion(Timeline(entries: [SubscriptionEntry(date: Date(), snapshot: WidgetSnapshot.read())], policy: .after(midnight)))
    }
}

struct SubscriptionWidgetView: View {
    let entry: SubscriptionEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        Group {
            if let snapshot = entry.snapshot {
                if snapshot.locked {
                    LockedSubscriptionWidget(snapshot: snapshot)
                } else if family == .systemMedium {
                    MediumSubscriptionWidget(snapshot: snapshot, date: entry.date)
                } else {
                    SmallSubscriptionWidget(snapshot: snapshot, date: entry.date)
                }
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    Image(systemName: "eye").font(.title2).widgetAccentable()
                    Text(L("native_open")).font(.caption).foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            }
        }
        .containerBackground(for: .widget) { SubscriptionWidgetBackground() }
        .widgetURL(destination)
    }

    private var destination: URL {
        if entry.snapshot?.locked == true { return AppConfiguration.url("paywall") }
        if family == .systemSmall, let item = entry.snapshot?.items.first {
            return AppConfiguration.url("subscriptions/" + item.id)
        }
        return AppConfiguration.url("")
    }
}

private struct SubscriptionWidgetBackground: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    var body: some View {
        if reduceTransparency {
            Color(uiColor: .systemBackground)
        } else {
            // WidgetKit removes this entire layer for the Home Screen's clear/tinted glass.
            LinearGradient(
                colors: colorScheme == .dark
                    ? [Color(red: 0.12, green: 0.15, blue: 0.17), Color(red: 0.06, green: 0.07, blue: 0.09)]
                    : [Color(uiColor: .systemBackground), Color(red: 0.93, green: 0.96, blue: 0.95)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        }
    }
}

private struct WidgetCaption: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .textCase(.uppercase)
            .tracking(0.5)
            .foregroundStyle(.secondary)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
    }
}

private struct WidgetAmount: View {
    let text: String
    @ScaledMetric(relativeTo: .title2) private var size = 28.0

    var body: some View {
        Text(text)
            .font(.system(size: min(size, 34), weight: .bold, design: .rounded))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.5)
            .contentTransition(.numericText())
    }
}

private struct WidgetMonthSummary: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            WidgetCaption(text: snapshot.monthLabel)
            WidgetAmount(text: snapshot.monthTotal)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(snapshot.monthLabel + ", " + snapshot.monthTotal)
    }
}

private struct WidgetComparison: View {
    let snapshot: WidgetSnapshot
    let amount: String
    @Environment(\.widgetRenderingMode) private var renderingMode
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.colorSchemeContrast) private var contrast

    private var tint: Color {
        guard renderingMode == .fullColor else { return .primary }
        if snapshot.deltaUp { return colorScheme == .dark ? Color(red: 1, green: 0.55, blue: 0.50) : Color(red: 0.65, green: 0.16, blue: 0.13) }
        return colorScheme == .dark ? Color(red: 0.48, green: 0.87, blue: 0.64) : Color(red: 0.12, green: 0.40, blue: 0.24)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label(amount, systemImage: snapshot.deltaUp ? "arrow.up.right" : "arrow.down.right")
                .font(.caption.weight(.semibold))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .foregroundStyle(tint)
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(tint.opacity(contrast == .increased ? 0.22 : 0.12), in: Capsule())
                .widgetAccentable()
            Text(snapshot.deltaLabel)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel((snapshot.deltaUp ? "↑ " : "↓ ") + amount + ", " + snapshot.deltaLabel)
    }
}

private struct SmallSubscriptionWidget: View {
    let snapshot: WidgetSnapshot
    let date: Date
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let item = snapshot.items.first {
                if !typeSize.isAccessibilitySize {
                    SurfaceLogo(name: item.name, url: item.logoURL, size: 32)
                    Spacer(minLength: 4)
                }
                Text(item.name).font(.headline).lineLimit(1).minimumScaleFactor(0.7)
                WidgetAmount(text: item.amount)
                Text(item.dueText(locale: snapshot.locale, now: date))
                    .font(.caption).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
                if let alsoDue = snapshot.alsoDue, !typeSize.isAccessibilitySize {
                    Text(alsoDue).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                }
            } else {
                WidgetMonthSummary(snapshot: snapshot)
                Spacer(minLength: 4)
                Text(snapshot.emptyLabel).font(.caption).foregroundStyle(.secondary).lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .accessibilityElement(children: .combine)
    }
}

private struct MediumSubscriptionWidget: View {
    let snapshot: WidgetSnapshot
    let date: Date
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        GeometryReader { geometry in
            HStack(alignment: .top, spacing: 14) {
                VStack(alignment: .leading, spacing: 6) {
                    WidgetMonthSummary(snapshot: snapshot)
                    Spacer(minLength: 0)
                    if let delta = snapshot.delta, !typeSize.isAccessibilitySize {
                        WidgetComparison(snapshot: snapshot, amount: delta)
                    }
                }
                .frame(width: geometry.size.width * 0.40, alignment: .leading)

                VStack(alignment: .leading, spacing: 4) {
                    WidgetCaption(text: snapshot.upcomingLabel)
                    if snapshot.items.isEmpty {
                        Text(snapshot.emptyLabel).font(.caption).foregroundStyle(.secondary)
                    } else {
                        ForEach(snapshot.items.prefix(rowLimit)) { item in
                            Link(destination: AppConfiguration.url("subscriptions/" + item.id)) {
                                WidgetRenewalRow(item: item, locale: snapshot.locale, date: date)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var rowLimit: Int {
        if typeSize.isAccessibilitySize { return 1 }
        return typeSize > .xLarge ? 2 : 3
    }
}

private struct WidgetRenewalRow: View {
    let item: WidgetItem
    let locale: String?
    let date: Date
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        HStack(spacing: 8) {
            if !typeSize.isAccessibilitySize { SurfaceLogo(name: item.name, url: item.logoURL, size: 26) }
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name).font(.caption.weight(.semibold)).lineLimit(1)
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 3) {
                        Text(item.amount).monospacedDigit()
                        Text("·")
                        Text(item.dueText(locale: locale, now: date))
                    }
                    VStack(alignment: .leading, spacing: 1) {
                        Text(item.amount).monospacedDigit().lineLimit(1).minimumScaleFactor(0.7)
                        Text(item.dueText(locale: locale, now: date)).lineLimit(1).minimumScaleFactor(0.8)
                    }
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 32, alignment: .leading)
        .contentShape(Rectangle())
        .foregroundStyle(.primary)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(item.name + ", " + item.amount + ", " + item.dueText(locale: locale, now: date))
    }
}

private struct LockedSubscriptionWidget: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            WidgetMonthSummary(snapshot: snapshot)
            Spacer(minLength: 6)
            Label(snapshot.lockCta, systemImage: "lock.fill")
                .font(.caption.weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .widgetAccentable()
                .accessibilityLabel(snapshot.lockTitle + ", " + snapshot.lockCta)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct SurfaceLogo: View {
    let name: String
    let url: URL?
    var size: CGFloat = 28
    var body: some View {
        Group {
            if let url, let image = UIImage(contentsOfFile: url.path) {
                Image(uiImage: image).resizable()
                    .widgetAccentedRenderingMode(.desaturated)
                    .scaledToFit()
            } else {
                Text(String(name.prefix(1)).uppercased()).font(.system(size: size * 0.45, weight: .semibold))
                    .frame(maxWidth: .infinity, maxHeight: .infinity).background(.quaternary)
            }
        }.frame(width: size, height: size).clipShape(Circle()).accessibilityHidden(true)
    }
}

struct SubEyeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SubEyeWidget", provider: SubscriptionProvider()) { SubscriptionWidgetView(entry: $0) }
            .configurationDisplayName(L("native_widgetTitle")).description(L("native_widgetDescription"))
            .supportedFamilies([.systemSmall, .systemMedium])
            .containerBackgroundRemovable(true)
    }
}

@main
struct SubEyeWidgets: WidgetBundle {
    var body: some Widget { SubEyeWidget(); RenewalActivityWidget() }
}

#if DEBUG
private enum WidgetPreview {
    static let date = Date(timeIntervalSince1970: 1_789_560_000)
    static let english = WidgetSnapshot(
        locked: false, lockTitle: "Upcoming renewals with Pro", lockCta: "Unlock Pro",
        monthLabel: "This month", monthTotal: "$148.97", upcomingLabel: "Upcoming", emptyLabel: "Nothing due",
        delta: "$24.99", deltaLabel: "vs last month", deltaUp: false, locale: "en",
        items: [
            WidgetItem(id: "icloud", name: "iCloud+", amount: "$2.99", date: "2026-09-17"),
            WidgetItem(id: "music", name: "Apple Music", amount: "$10.99", date: "2026-09-18"),
            WidgetItem(id: "adobe", name: "Adobe Creative Cloud", amount: "$59.99", date: "2026-09-20")
        ]
    )
    static var ukrainian: WidgetSnapshot {
        var snapshot = english
        snapshot.locale = "uk"
        snapshot.monthLabel = "Цього місяця"; snapshot.monthTotal = "₴6,233.63"
        snapshot.upcomingLabel = "Найближчі"; snapshot.deltaLabel = "проти минулого місяця"
        snapshot.delta = "₴3,299.10"; snapshot.deltaUp = true
        snapshot.items = [
            WidgetItem(id: "icloud", name: "iCloud+", amount: "₴133.46", date: "2026-09-30"),
            WidgetItem(id: "lifecell", name: "Lifecell", amount: "₴200.00", date: "2026-10-02"),
            WidgetItem(id: "fastmail", name: "Fastmail", amount: "₴321.37", date: "2026-10-04")
        ]
        return snapshot
    }
    static var locked: WidgetSnapshot {
        var snapshot = english
        snapshot.locked = true; snapshot.items = []; snapshot.delta = nil
        return snapshot
    }
    static var empty: WidgetSnapshot {
        var snapshot = english
        snapshot.monthTotal = "$0.00"; snapshot.items = []; snapshot.delta = nil
        return snapshot
    }
}

#Preview("Monthly spending", as: .systemMedium) {
    SubEyeWidget()
} timeline: {
    SubscriptionEntry(date: WidgetPreview.date, snapshot: WidgetPreview.ukrainian)
    SubscriptionEntry(date: WidgetPreview.date, snapshot: WidgetPreview.english)
    SubscriptionEntry(date: WidgetPreview.date, snapshot: WidgetPreview.locked)
    SubscriptionEntry(date: WidgetPreview.date, snapshot: WidgetPreview.empty)
    SubscriptionEntry(date: WidgetPreview.date, snapshot: nil)
}

#Preview("Next payment", as: .systemSmall) {
    SubEyeWidget()
} timeline: {
    SubscriptionEntry(date: WidgetPreview.date, snapshot: WidgetPreview.english)
    SubscriptionEntry(date: WidgetPreview.date, snapshot: WidgetPreview.ukrainian)
    SubscriptionEntry(date: WidgetPreview.date, snapshot: WidgetPreview.locked)
    SubscriptionEntry(date: WidgetPreview.date, snapshot: WidgetPreview.empty)
}
#endif
