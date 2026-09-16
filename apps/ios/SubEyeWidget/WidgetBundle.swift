import SwiftUI
import WidgetKit

struct SubscriptionEntry: TimelineEntry {
    var date: Date
    var snapshot: WidgetSnapshot?
}

struct SubscriptionProvider: TimelineProvider {
    func placeholder(in context: Context) -> SubscriptionEntry { SubscriptionEntry(date: Date(), snapshot: nil) }
    func getSnapshot(in context: Context, completion: @escaping (SubscriptionEntry) -> Void) { completion(SubscriptionEntry(date: Date(), snapshot: WidgetSnapshot.read())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<SubscriptionEntry>) -> Void) {
        let midnight = Calendar.current.nextDate(after: Date(), matching: DateComponents(hour: 0, minute: 0), matchingPolicy: .nextTime) ?? Date().addingTimeInterval(86_400)
        completion(Timeline(entries: [SubscriptionEntry(date: Date(), snapshot: WidgetSnapshot.read())], policy: .after(midnight)))
    }
}

struct SubscriptionWidgetView: View {
    let entry: SubscriptionEntry
    @Environment(\.widgetFamily) private var family
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        Group {
            if let snapshot = entry.snapshot {
                if family == .systemMedium, !snapshot.locked {
                    HStack(alignment: .center, spacing: 16) {
                        summary(snapshot).frame(maxWidth: .infinity, alignment: .leading)
                        VStack(alignment: .leading, spacing: 0) {
                            renewals(snapshot, limit: typeSize.isAccessibilitySize ? 1 : 3)
                        }.frame(maxWidth: .infinity, alignment: .leading)
                    }
                } else {
                    VStack(alignment: .leading, spacing: 4) {
                        summary(snapshot)
                        if snapshot.locked {
                            Link(destination: AppConfiguration.url("paywall")) {
                                Label(snapshot.lockTitle, systemImage: "lock").font(.caption)
                                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading).contentShape(Rectangle())
                            }
                        } else { renewals(snapshot, limit: 1) }
                    }
                }
            } else { VStack(alignment: .leading, spacing: 12) { Text("SubEye").font(.headline); Text(L("native_open")).font(.caption).foregroundStyle(.secondary) } }
        }.environment(\.colorScheme, .dark)
            .containerBackground(Color(red: 15/255, green: 17/255, blue: 21/255), for: .widget)
            .widgetURL(AppConfiguration.url("subscriptions")).tint(Color(red: 0.47, green: 0.91, blue: 0.66))
    }
    private func summary(_ snapshot: WidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("SubEye").font(.headline)
            Text(snapshot.monthLabel).font(.caption).foregroundStyle(.secondary)
            Text(snapshot.monthTotal).font(.title2.bold()).monospacedDigit().lineLimit(1).minimumScaleFactor(0.6)
                .accessibilityLabel(snapshot.monthLabel + ", " + snapshot.monthTotal)
            if let delta = snapshot.delta {
                Text((snapshot.deltaUp ? "↑ " : "↓ ") + delta + " " + snapshot.deltaLabel).font(.caption2).foregroundStyle(.secondary)
            }
            if family == .systemMedium, let alsoDue = snapshot.alsoDue {
                Text(alsoDue).font(.caption2).foregroundStyle(.secondary)
            }
        }
    }
    @ViewBuilder private func renewals(_ snapshot: WidgetSnapshot, limit: Int) -> some View {
        ForEach(snapshot.items.prefix(limit)) { item in
            Link(destination: AppConfiguration.url("subscriptions/" + item.id)) {
                HStack(spacing: 6) {
                    SurfaceLogo(name: item.name, url: item.logoURL, size: 24)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(item.name).font(.caption.weight(.semibold)).lineLimit(1)
                        Text(item.amount).font(.caption.monospacedDigit()).lineLimit(1).minimumScaleFactor(0.6)
                        Text(item.dueText(locale: snapshot.locale)).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                    }
                }.frame(maxWidth: .infinity, minHeight: 44, alignment: .leading).contentShape(Rectangle()).foregroundStyle(.primary)
            }.accessibilityLabel(item.name + ", " + item.amount + ", " + item.dueText(locale: snapshot.locale))
        }
        if snapshot.items.isEmpty { Text(snapshot.emptyLabel).font(.caption).foregroundStyle(.secondary) }
    }
}

struct SurfaceLogo: View {
    let name: String
    let url: URL?
    var size: CGFloat = 28
    var body: some View {
        Group {
            if let url, let image = UIImage(contentsOfFile: url.path) {
                Image(uiImage: image).resizable().scaledToFit()
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
    }
}

@main
struct SubEyeWidgets: WidgetBundle {
    var body: some Widget { SubEyeWidget(); RenewalActivityWidget() }
}
