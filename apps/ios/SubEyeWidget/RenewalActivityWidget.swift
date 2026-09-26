import ActivityKit
import SwiftUI
import WidgetKit

struct RenewalActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RenewalActivity.self) { context in
            lockScreen(context)
                .modifier(ActivityGlassBackground())
                .widgetURL(destination(context))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { Image(systemName: "repeat.circle.fill").foregroundStyle(.green) }
                DynamicIslandExpandedRegion(.trailing) { if visible(context), context.state.count > 1 { Text(context.state.total).font(.headline).monospacedDigit() } }
                DynamicIslandExpandedRegion(.center) { Text("SubEye").font(.headline) }
                DynamicIslandExpandedRegion(.bottom) {
                    if visible(context) {
                        VStack(spacing: 10) {
                            ForEach(context.state.items, id: \.id) { item in
                                HStack(spacing: 8) {
                                    SurfaceLogo(name: item.name, url: item.logoURL, size: 24)
                                    Text(item.name).font(.subheadline).lineLimit(1)
                                    Spacer(); Text(item.price).font(.subheadline).monospacedDigit()
                                }
                            }
                            actionButtons(context)
                        }
                    }
                }
            } compactLeading: { Image(systemName: "repeat").foregroundStyle(.green) }
            compactTrailing: { if visible(context) { Text(String(context.state.count)).monospacedDigit() } }
            minimal: { Image(systemName: "repeat").foregroundStyle(.green) }
            .widgetURL(destination(context))
        }
    }
    private func destination(_ context: ActivityViewContext<RenewalActivity>) -> URL {
        if visible(context), context.state.count == 1, let item = context.state.items.first {
            return AppConfiguration.url("subscriptions/" + item.id)
        }
        return AppConfiguration.url("subscriptions/due/" + context.attributes.day)
    }
    @ViewBuilder private func lockScreen(_ context: ActivityViewContext<RenewalActivity>) -> some View {
        if visible(context) {
            if context.state.count == 1, let item = context.state.items.first {
                VStack(spacing: 12) {
                    HStack(spacing: 12) {
                        SurfaceLogo(name: item.name, url: item.logoURL, size: 44)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(item.name).font(.headline).lineLimit(1)
                            Text(L("native_liveDay")).font(.caption).foregroundStyle(.secondary)
                        }.frame(maxWidth: .infinity, alignment: .leading)
                        Text(item.price).font(.title3.bold()).monospacedDigit().lineLimit(1).minimumScaleFactor(0.75)
                    }.frame(minHeight: 44)
                    actionButtons(context)
                }.padding(16)
            } else {
                VStack(spacing: 8) {
                    HStack(spacing: 6) {
                        Text(L("native_liveDay"))
                        if context.state.count > 2 { Text("+\(context.state.count - 2)").foregroundStyle(.secondary) }
                        Spacer(minLength: 8)
                        Text(context.state.total).bold().monospacedDigit().lineLimit(1).minimumScaleFactor(0.75)
                    }.font(.caption)
                    VStack(spacing: 6) {
                        ForEach(context.state.items.prefix(2), id: \.id) { item in
                            HStack(spacing: 10) {
                                SurfaceLogo(name: item.name, url: item.logoURL)
                                Text(item.name).lineLimit(1)
                                Spacer(minLength: 8)
                                Text(item.price).monospacedDigit().lineLimit(1)
                            }.font(.subheadline)
                        }
                    }
                    actionButtons(context)
                }.padding(.horizontal, 16).padding(.vertical, 10)
            }
        } else {
            Text(L(context.isStale ? "native_liveExpired" : "native_liveHidden")).font(.caption).padding(16)
        }
    }
    private func visible(_ context: ActivityViewContext<RenewalActivity>) -> Bool {
        !context.state.hidden && !context.isStale && UserDefaults(suiteName: AppConfiguration.group)?.bool(forKey: AppConfiguration.namespace + ".live.enabled") == true
    }
    private func actionButtons(_ context: ActivityViewContext<RenewalActivity>) -> some View {
        HStack(spacing: 12) {
            Button(intent: KeepRenewalIntent(day: context.attributes.day)) {
                Text(L("native_keep")).frame(maxWidth: .infinity, minHeight: 44).background(.quaternary, in: Capsule())
            }.accessibilityHint(L("native_keepHint")).accessibilityIdentifier("keepRenewal")
            Button(intent: PlanCancellationIntent(subscriptionId: context.state.count == 1 ? context.state.items.first?.id ?? "" : "", day: context.attributes.day)) {
                Text(L("native_cancel")).frame(maxWidth: .infinity, minHeight: 44).background(.quaternary, in: Capsule())
            }.accessibilityHint(L("native_cancelHint"))
        }.font(.subheadline.weight(.semibold)).buttonStyle(.plain)
    }
}

private struct ActivityGlassBackground: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 26, *) {
            content
                .background { Color.clear.glassEffect(.regular, in: .rect(cornerRadius: 28)) }
                .activityBackgroundTint(.clear)
        } else {
            content.activityBackgroundTint(nil)
        }
    }
}
