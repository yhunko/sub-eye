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
                DynamicIslandExpandedRegion(.leading) {
                    if visible(context) { avatarCluster(context, size: 30) }
                    else { Image(systemName: "eye.slash.fill").foregroundStyle(.secondary) }
                }
                DynamicIslandExpandedRegion(.trailing, priority: 1) {
                    if visible(context) {
                        Text(context.state.total).font(.headline).monospacedDigit().lineLimit(1).minimumScaleFactor(0.7)
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    if visible(context) {
                        if context.state.count == 1, let item = context.state.items.first {
                            Text(item.name).font(.headline).lineLimit(1)
                        } else {
                            HStack(spacing: 4) {
                                Text(L("native_liveDay")).font(.headline).lineLimit(1)
                                Image(systemName: "chevron.right").font(.caption2.weight(.bold)).foregroundStyle(.secondary)
                            }
                        }
                    } else {
                        Text("SubEye").font(.headline)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if visible(context) {
                        if context.state.count == 1 { actionButtons(context, compact: true) }
                        else { renewalRows(context) }
                    }
                }
            } compactLeading: {
                if visible(context), !context.state.items.isEmpty { avatarCluster(context, size: 20) }
                else { Image(systemName: "eye.slash").foregroundStyle(.secondary) }
            }
            compactTrailing: {
                if visible(context) { Text(context.state.total).monospacedDigit().lineLimit(1).minimumScaleFactor(0.6) }
            }
            minimal: {
                if visible(context), !context.state.items.isEmpty { avatarCluster(context, size: 20) }
                else { Image(systemName: "eye.slash").foregroundStyle(.secondary) }
            }
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
                        SurfaceLogo(name: item.name, url: item.logoURL, size: 44, fullColor: true, scale: LiveActivityLogo.scale)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(item.name).font(.headline).lineLimit(1)
                            Text(L("native_liveRenewsToday")).font(.caption).foregroundStyle(.secondary)
                        }.frame(maxWidth: .infinity, alignment: .leading)
                        Text(item.price).font(.title3.bold()).monospacedDigit().lineLimit(1).minimumScaleFactor(0.75)
                    }.frame(minHeight: 44)
                    actionButtons(context, compact: false)
                }.padding(16)
            } else {
                VStack(spacing: 8) {
                    HStack(spacing: 6) {
                        Text(L("native_liveDay"))
                        if context.state.count > 2 { Text("+\(context.state.count - 2)").foregroundStyle(.secondary) }
                        Spacer(minLength: 8)
                        Text(context.state.total).bold().monospacedDigit().lineLimit(1).minimumScaleFactor(0.75)
                        Image(systemName: "chevron.right").font(.caption2.weight(.bold)).foregroundStyle(.secondary)
                    }.font(.caption)
                    renewalRows(context)
                }.padding(.horizontal, 16).padding(.vertical, 10)
            }
        } else {
            Text(L(context.isStale ? "native_liveExpired" : "native_liveHidden")).font(.caption).padding(16)
        }
    }
    private func visible(_ context: ActivityViewContext<RenewalActivity>) -> Bool {
        !context.state.hidden && !context.isStale && UserDefaults(suiteName: AppConfiguration.group)?.bool(forKey: AppConfiguration.namespace + ".live.enabled") == true
    }
    private func avatarCluster(_ context: ActivityViewContext<RenewalActivity>, size: CGFloat) -> some View {
        HStack(spacing: -(size * 0.28)) {
            if let first = context.state.items.first {
                activityAvatar(first, size: size)
                    .overlay { Circle().stroke(.black.opacity(0.8), lineWidth: 2) }
            }
            if context.state.count == 2, let second = context.state.items.dropFirst().first {
                activityAvatar(second, size: size)
                    .overlay { Circle().stroke(.black.opacity(0.8), lineWidth: 2) }
            } else if context.state.count > 2 {
                Text("+\(context.state.count - 1)")
                    .font(.system(size: max(8, size * 0.34), weight: .bold, design: .rounded))
                    .monospacedDigit().lineLimit(1).minimumScaleFactor(0.6)
                    .foregroundStyle(.white)
                    .frame(width: size, height: size)
                    .background(.white.opacity(0.18), in: Circle())
                    .overlay { Circle().stroke(.black.opacity(0.8), lineWidth: 2) }
                    .accessibilityHidden(true)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(context.state.items.map(\.name).joined(separator: ", "))
    }
    private func activityAvatar(_ item: RenewalActivity.Item, size: CGFloat) -> some View {
        SurfaceLogo(name: item.name, url: item.logoURL, size: size, fullColor: true, scale: LiveActivityLogo.scale)
            .background(.white.opacity(0.14), in: Circle())
    }
    private func renewalRows(_ context: ActivityViewContext<RenewalActivity>) -> some View {
        VStack(spacing: 6) {
            ForEach(context.state.items.prefix(2), id: \.id) { item in
                HStack(spacing: 8) {
                    SurfaceLogo(name: item.name, url: item.logoURL, size: 24, fullColor: true, scale: LiveActivityLogo.scale)
                    Text(item.name).font(.subheadline).lineLimit(1)
                    Spacer(minLength: 8)
                    Text(item.price).font(.subheadline).monospacedDigit().lineLimit(1)
                }
            }
        }
    }
    private func actionButtons(_ context: ActivityViewContext<RenewalActivity>, compact: Bool) -> some View {
        HStack(spacing: 12) {
            Button(intent: KeepRenewalIntent(day: context.attributes.day)) {
                Label(L("native_keep"), systemImage: "checkmark")
                    .frame(maxWidth: .infinity, minHeight: compact ? 36 : 44).background(.white.opacity(0.12), in: Capsule())
            }.accessibilityHint(L("native_keepHint")).accessibilityIdentifier("keepRenewal")
            Link(destination: cancellationDestination(context)) {
                Label(L("native_cancel"), systemImage: "xmark")
                    .frame(maxWidth: .infinity, minHeight: compact ? 36 : 44).background(.red.opacity(0.2), in: Capsule())
            }.accessibilityHint(L("native_cancelHint")).accessibilityIdentifier("planCancellation")
        }.font(.subheadline.weight(.semibold)).buttonStyle(.plain)
    }
    private func cancellationDestination(_ context: ActivityViewContext<RenewalActivity>) -> URL {
        guard let item = context.state.items.first else { return destination(context) }
        var components = URLComponents(url: AppConfiguration.url("subscriptions/" + item.id), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "action", value: "plan-cancellation")]
        return components.url!
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
