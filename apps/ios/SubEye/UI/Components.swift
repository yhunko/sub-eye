import SwiftUI
import StoreKit
import SubEyeCore

struct DestructiveMenuLabel: View {
    let title: String
    var body: some View {
        Label { Text(title) } icon: {
            // Native menus discard SwiftUI symbol colors; preserve the destructive tint in the image.
            Image(uiImage: UIImage(systemName: "trash")!.withTintColor(UIColor(AppTheme.danger), renderingMode: .alwaysOriginal)).renderingMode(.original)
        }.foregroundStyle(AppTheme.danger)
    }
}

struct ToneIcon: View {
    let symbol: String
    var tone: Color? = nil
    var size: CGFloat = 30
    var body: some View {
        Image(systemName: symbol).font(.system(size: size * 0.5, weight: .semibold))
            .foregroundStyle(tone ?? AppTheme.text.opacity(0.8))
            .frame(width: size, height: size)
            .background(tone?.opacity(0.15) ?? Color.white.opacity(0.08), in: Circle())
            .accessibilityHidden(true)
    }
}

struct InstallmentIcon: View {
    let symbol: String
    let tint: String
    var lenderName: String? = nil
    var lenderDomain: String? = nil
    let logos: LogoService
    var size: CGFloat = 38
    var ring = AppTheme.background
    var body: some View {
        ToneIcon(symbol: InstallmentStyle.symbol(symbol), tone: InstallmentStyle.color(tint), size: size)
            .overlay(alignment: .bottomTrailing) {
                if let lenderDomain {
                    BrandIcon(name: lenderName ?? lenderDomain, domain: lenderDomain, logos: logos, size: size * 0.45)
                        .padding(max(1.5, size * 0.04)).background(ring, in: Circle()).offset(x: size * 0.08, y: size * 0.08)
                }
            }
            .accessibilityHidden(true)
    }
}

struct EventIcon: View {
    let event: CalendarEvent
    let logos: LogoService
    var size: CGFloat = 36
    var dimmed = false
    var body: some View {
        if let mark = event.installment {
            InstallmentIcon(symbol: mark.symbol, tint: mark.tint, lenderDomain: event.domain, logos: logos, size: size).opacity(dimmed ? 0.4 : 1)
        } else {
            BrandIcon(name: event.name, domain: event.domain, logos: logos, size: size, dimmed: dimmed)
        }
    }
}

extension CalendarEvent {
    var owner: Route { installment == nil ? .subscription(subscriptionId) : .installment(subscriptionId) }
}

extension Route {
    static func day(_ day: Date, events: [CalendarEvent]) -> Route {
        let owners = Set(events.map(\.owner))
        return owners.count == 1 ? owners.first! : .due(Day.key(day))
    }
}

struct ActionButton: View {
    let title: String
    var role: ButtonRole?
    var icon: String? = nil
    var styledRow = false
    var iconOnly = false
    var action: @MainActor () async throws -> Void
    @State private var run: UUID?
    @State private var error: String?
    var body: some View {
        Button(role: role) { run = UUID() } label: {
            if styledRow {
                SettingsRow(icon: icon, title: title, color: role == .destructive ? AppTheme.danger : AppTheme.accentBright, chevron: false)
                    .overlay(alignment: .trailing) { if run != nil { ProgressView().controlSize(.small).padding(.trailing, 16) } }
            } else if iconOnly {
                if run != nil { ProgressView().controlSize(.small) }
                else { Label(title, systemImage: icon ?? "checkmark").labelStyle(.iconOnly) }
            } else { HStack { Text(title); if run != nil { ProgressView().controlSize(.small) } } }
        }
        .accessibilityLabel(title)
        .disabled(run != nil)
        .task(id: run) {
            guard run != nil else { return }
            do { try await action() }
            catch is CancellationError { }
            catch { self.error = Display.error(error) }
            run = nil
        }
        .alert(L("native_error"), isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
            Button(L("common_done"), role: .cancel) { error = nil }
        } message: { Text(error ?? "") }
    }
}

struct BrandIcon: View {
    let name: String
    let domain: String?
    let logos: LogoService
    var size: CGFloat = 38
    var dimmed = false
    var variant: String? = nil
    @State private var payload: LogoPayload?
    @State private var image: UIImage?
    @State private var revision = 0
    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().scaledToFit().padding(payload?.plate == true ? 0 : size * 0.15)
            } else {
                Text(String(name.prefix(1)).uppercased()).font(.system(size: size * 0.42, weight: .bold)).foregroundStyle(AppTheme.text)
            }
        }
        .frame(width: size, height: size)
        .background(AppTheme.surfaceAlt, in: Circle())
        .clipShape(Circle()).opacity(dimmed ? 0.4 : 1)
        .accessibilityHidden(true)
        .onReceive(NotificationCenter.default.publisher(for: LogoService.variantChanged)) { note in
            if note.object as? String == domain { revision += 1 }
        }
        .task(id: "\(domain ?? ""):\(variant ?? "saved"):\(revision)") {
            guard let domain else { payload = nil; image = nil; return }
            let variant = if let variant { variant } else { await logos.variant(for: domain) }
            payload = await logos.cached(domain: domain, variant: variant)
            image = payload?.bytes.flatMap(UIImage.init(data:))
            guard !Task.isCancelled else { return }
            payload = await logos.load(domain: domain, variant: variant)
            guard !Task.isCancelled else { return }
            image = payload?.bytes.flatMap(UIImage.init(data:))
        }
    }
}

struct SubscriptionCell: View {
    let row: SubscriptionRow
    let currency: String
    let logos: LogoService
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        HStack(alignment: .center, spacing: 11) {
            BrandIcon(name: row.subscription.name, domain: row.subscription.brandDomain, logos: logos, dimmed: row.status == .cancelled)
            if typeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 5) { name; price }
            } else {
                name.frame(maxWidth: .infinity, alignment: .leading)
                price.multilineTextAlignment(.trailing)
            }
        }
        .padding(.horizontal, 10).padding(.vertical, 8).frame(minHeight: 64)
        .appCard(radius: 18, fill: AppTheme.rowFill(row.status), border: AppTheme.rowBorder(row.status))
        .accessibilityElement(children: .combine)
    }
    private var name: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(row.subscription.name).appFont(15, weight: .semibold).foregroundStyle(row.status == .cancelled ? AppTheme.muted : AppTheme.text)
                .strikethrough(row.status == .cancelled).lineLimit(typeSize.isAccessibilitySize ? nil : 1)
            Text(subtitle).appFont(12.5, relativeTo: .subheadline).foregroundStyle(AppTheme.muted).lineLimit(typeSize.isAccessibilitySize ? nil : 1)
        }
    }
    private var price: some View {
        Text(Display.money(row.nextAmount ?? row.amount, currency)).appFont(15.5, weight: .bold).monospacedDigit()
            .foregroundStyle(row.nextAmount == nil ? AppTheme.muted : AppTheme.text).fixedSize(horizontal: true, vertical: false)
    }
    private var subtitle: String {
        var parts: [String] = []
        if row.status != .active { parts.append(L("subs_status_" + row.status.rawValue)) }
        let date = row.status == .cancelling ? row.subscription.willBeCancelledAt.flatMap(Day.parse) : row.status == .paused ? row.subscription.resumeAt.flatMap(Day.parse) : row.nextDate
        if row.status != .cancelled, let date { parts.append(Display.when(date)) }
        parts.append(Display.cadence(row.subscription))
        if row.subscription.every != 1 || row.subscription.period != .month { parts.append(Display.money(row.monthly, currency) + L("subs_perMonthSuffix")) }
        return parts.joined(separator: " · ")
    }
}

struct InstallmentCell: View {
    let row: InstallmentRow
    let logos: LogoService
    // Set where plans sit beside subscriptions, so the list shows one currency.
    var currency: String? = nil
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        HStack(alignment: .center, spacing: 11) {
            InstallmentIcon(symbol: row.plan.symbol, tint: row.plan.tint, lenderName: row.plan.lenderName, lenderDomain: row.plan.lenderDomain, logos: logos)
            if typeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 5) { name; amount }
            } else {
                name.frame(maxWidth: .infinity, alignment: .leading)
                amount.multilineTextAlignment(.trailing)
            }
        }
        .padding(.horizontal, 10).padding(.vertical, 8).frame(minHeight: 64)
        .appCard(radius: 18, fill: AppTheme.surface, border: AppTheme.border)
        .accessibilityElement(children: .combine)
    }
    private var name: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(row.plan.name).appFont(15, weight: .semibold).foregroundStyle(AppTheme.text).lineLimit(typeSize.isAccessibilitySize ? nil : 1)
            Text(subtitle).appFont(12.5, relativeTo: .subheadline).foregroundStyle(AppTheme.muted).lineLimit(typeSize.isAccessibilitySize ? nil : 1)
        }
    }
    @ViewBuilder private var amount: some View {
        if let amountText {
            Text(amountText).appFont(15.5, weight: .bold).monospacedDigit()
                .foregroundStyle(row.nextAmount == nil ? AppTheme.muted : AppTheme.text).fixedSize(horizontal: true, vertical: false)
        }
    }
    private var amountText: String? {
        guard let currency else { return Display.money(row.nextAmount ?? row.paid, row.plan.currency) }
        return row.nextConverted.map { Display.money($0, currency) }
    }
    private var subtitle: String {
        guard !row.finished else { return L("installment_paidOff") }
        let progress = L("installment_progress", ["paid": String(row.paidCount), "count": String(row.count)])
        return row.nextDate.map { Display.when($0) + " · " + progress } ?? progress
    }
}

struct EventCell: View {
    let event: CalendarEvent
    let currency: String
    var logos: LogoService? = nil
    var showDate = true
    var note: String? = nil
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            if let logos { EventIcon(event: event, logos: logos, dimmed: event.kind == .ends) }
            VStack(alignment: .leading, spacing: 4) {
                Text(event.name).appFont(15, weight: .semibold).lineLimit(typeSize.isAccessibilitySize ? nil : 1)
                Label(kindLabel + (showDate ? " · " + Display.when(event.date) : ""), systemImage: eventIcon)
                    .appFont(12.5).foregroundStyle(event.kind == .resumes ? AppTheme.accent : AppTheme.muted)
                if typeSize.isAccessibilitySize { figures(.leading) }
            }.frame(maxWidth: .infinity, alignment: .leading)
            if !typeSize.isAccessibilitySize { figures(.trailing) }
        }.foregroundStyle(AppTheme.text).frame(minHeight: 44).contentShape(Rectangle()).accessibilityElement(children: .combine)
    }
    private func figures(_ alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: 3) {
            amount
            if let note { Text(note).appFont(12, relativeTo: .caption).foregroundStyle(AppTheme.muted).monospacedDigit() }
        }
    }
    private var amount: some View {
        Text(Display.money(event.amount, currency)).appFont(14, weight: .bold).monospacedDigit().fixedSize(horizontal: true, vertical: false)
            .strikethrough(event.kind == .ends).foregroundStyle(event.kind == .ends ? AppTheme.muted : AppTheme.text)
            .accessibilityLabel(event.kind == .ends ? L("home_attnStops", ["amount": Display.money(event.amount, currency)]) : Display.money(event.amount, currency))
    }
    private var kindLabel: String {
        if let mark = event.installment {
            guard let number = mark.number else { return L("calendar_kindInstallmentPayoff") }
            return number == mark.count ? L("calendar_kindInstallmentFinal") : L("calendar_kindInstallment", ["number": String(number), "count": String(mark.count)])
        }
        return event.purchase == true ? L("calendar_kindPurchase") : Display.event(event.kind)
    }
    private var eventIcon: String {
        if let mark = event.installment { return mark.number == nil ? "checkmark.seal" : mark.number == mark.count ? "flag.checkered" : "creditcard" }
        return switch event.kind {
        case .trialEnds: "hourglass"
        case .introEnds: "tag"
        case .updatesEnd: "key"
        case .priceChange: "arrow.up.right"
        case .payment: event.purchase == true ? "key" : "arrow.triangle.2.circlepath"
        case .resumes: "play.circle"
        case .ends: "xmark.circle"
        }
    }
}

struct AmountLine: View {
    let title: String
    let value: Double
    let currency: String
    var large = false
    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .firstTextBaseline) { Text(title).foregroundStyle(.secondary); Spacer(); amount }
            VStack(alignment: .leading, spacing: 6) { Text(title).foregroundStyle(.secondary); amount }
        }.accessibilityElement(children: .combine)
    }
    private var amount: some View { Text(Display.money(value, currency)).font(large ? .largeTitle.bold() : .body.weight(.semibold)).monospacedDigit().fixedSize(horizontal: false, vertical: true) }
}

struct EmptySubscriptions: View {
    @Binding var sheet: SheetRoute?
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "repeat.circle").font(.system(size: 48)).foregroundStyle(.tint)
            Text(L("native_noSubscriptions")).font(.title2.bold())
            Text(L("native_emptyBody")).foregroundStyle(.secondary)
            Button(L("subs_emptyAddSubscription")) { sheet = .editor(nil) }.buttonStyle(.borderedProminent).foregroundStyle(.black).controlSize(.large).accessibilityIdentifier("emptyNewSubscription")
            Button(L("subs_addInstallment")) { sheet = .installmentEditor(nil) }.controlSize(.large).accessibilityIdentifier("emptyNewInstallment")
        }.multilineTextAlignment(.center).padding(32).frame(maxWidth: .infinity)
    }
}

// Set on a split view's leading column, whose links open in the trailing column rather than pushing beside the list.
// Equal per tab, so the closure does not count as a change on every update.
struct OpenRouteAction: Equatable {
    let tab: AppTab
    let open: (Route) -> Void
    static func == (left: Self, right: Self) -> Bool { left.tab == right.tab }
}

extension EnvironmentValues {
    @Entry var openRoute: OpenRouteAction? = nil
    // Set on a split view's trailing column, which has the list beside it.
    @Entry var besideList = false
}

struct RouteLink<Label: View>: View {
    let value: Route
    @ViewBuilder let label: () -> Label
    @Environment(\.openRoute) private var openRoute
    var body: some View {
        if let openRoute { Button(action: { openRoute.open(value) }, label: label) }
        else { NavigationLink(value: value, label: label) }
    }
}

struct UpdateCard: View {
    let release: StoreRelease
    let dismiss: () -> Void
    @State private var storePage = 0
    @Environment(\.dynamicTypeSize) private var typeSize
    @ScaledMetric private var iconSize: CGFloat = 40
    var body: some View {
        Group {
            if typeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top) { icon; Spacer(); close }
                    summary
                    update
                }
            } else {
                HStack(spacing: 12) { icon; summary; update; close }
            }
        }.padding(.leading, 14).padding(.trailing, 6).padding(.vertical, 12).appCard(radius: 20)
            .appStoreProductPage(storePage)
    }
    private var icon: some View {
        let icons = Bundle.main.object(forInfoDictionaryKey: "CFBundleIcons") as? [String: Any]
        let files = (icons?["CFBundlePrimaryIcon"] as? [String: Any])?["CFBundleIconFiles"] as? [String]
        return Group {
            if let image = files?.last.flatMap(UIImage.init(named:)) { Image(uiImage: image).resizable() }
            else { Image(systemName: "app.fill").resizable().foregroundStyle(AppTheme.accent) }
        }.frame(width: iconSize, height: iconSize).clipShape(RoundedRectangle(cornerRadius: iconSize * 0.225, style: .continuous)).accessibilityHidden(true)
    }
    private var summary: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(L("update_available", ["version": release.version])).appFont(15, weight: .semibold).fixedSize(horizontal: false, vertical: true)
            Text(release.notes ?? L("update_notes")).appFont(13, relativeTo: .footnote).foregroundStyle(AppTheme.muted).lineLimit(2)
        }.frame(maxWidth: .infinity, alignment: .leading).accessibilityElement(children: .combine)
    }
    private var update: some View {
        Button(L("update_action")) { storePage += 1 }
            .appFont(14, weight: .semibold).fixedSize()
            .buttonStyle(.borderedProminent).buttonBorderShape(.capsule)
            .tint(AppTheme.accent).foregroundStyle(AppTheme.background)
    }
    private var close: some View {
        Button(action: dismiss) {
            Image(systemName: "xmark").appFont(13, weight: .semibold).foregroundStyle(AppTheme.muted)
                .frame(minWidth: 32, minHeight: 44).contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityLabel(L("update_dismiss"))
    }
}

extension View {
    func appStoreProductPage(_ request: Int) -> some View {
        background(AppStoreProductPage(request: request).frame(width: 0, height: 0).accessibilityHidden(true))
    }
}

// SKStoreProductViewController refuses to be embedded, so a SwiftUI sheet cannot host it; it has to be presented modally.
private struct AppStoreProductPage: UIViewControllerRepresentable {
    let request: Int
    func makeCoordinator() -> Coordinator { Coordinator(handled: request) }
    func makeUIViewController(context: Context) -> UIViewController { UIViewController() }
    func updateUIViewController(_ host: UIViewController, context: Context) {
        guard request != context.coordinator.handled else { return }
        context.coordinator.handled = request
        guard host.presentedViewController == nil else { return }
        let page = SKStoreProductViewController()
        page.delegate = context.coordinator
        host.present(page, animated: true)
        let openURL = context.environment.openURL
        Task {
            do { try await page.loadProduct(withParameters: [SKStoreProductParameterITunesItemIdentifier: UpdateService.appID]) }
            catch {
                page.dismiss(animated: true)
                openURL(URL(string: "https://apps.apple.com/app/id\(UpdateService.appID)")!)
            }
        }
    }
    @MainActor final class Coordinator: NSObject, @MainActor SKStoreProductViewControllerDelegate {
        var handled: Int
        init(handled: Int) { self.handled = handled }
        func productViewControllerDidFinish(_ controller: SKStoreProductViewController) { controller.dismiss(animated: true) }
    }
}

struct SubscriptionIdentity: View {
    let subscription: Subscription
    let logos: LogoService
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    var body: some View {
        HStack(spacing: 12) {
            BrandIcon(name: subscription.name, domain: subscription.brandDomain, logos: logos, size: 40)
            VStack(alignment: .leading, spacing: 4) {
                Text(subscription.name).appFont(17, weight: .semibold)
                Text(Display.money(NSDecimalNumber(decimal: Money.parse(subscription.cost) ?? 0).doubleValue, subscription.currency) + " · " + Display.cadence(subscription))
                    .appFont(13).foregroundStyle(AppTheme.muted)
            }.fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }.padding(16).frame(maxWidth: .infinity, alignment: .leading)
            .background {
                if reduceTransparency { AppTheme.surface }
                else { BrandWash(domain: subscription.brandDomain, logos: logos) }
            }
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay { RoundedRectangle(cornerRadius: 20).strokeBorder(AppTheme.border, lineWidth: 1) }
            .accessibilityElement(children: .combine)
    }
}

struct SheetChoice: View {
    let title: String
    var subtitle: String? = nil
    let selected: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).appFont(16).foregroundStyle(AppTheme.text)
                    if let subtitle { Text(subtitle).appFont(13).foregroundStyle(AppTheme.muted) }
                }.fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22)).foregroundStyle(selected ? AppTheme.accentBright : AppTheme.muted).accessibilityHidden(true)
            }.padding(16).frame(minHeight: 52).contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityAddTraits(selected ? .isSelected : [])
    }
}

struct KeyboardAwareScrollView<Field: Hashable, Content: View>: View {
    let focusedField: Field?
    @ViewBuilder var content: Content
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        ScrollViewReader { proxy in
            ScrollView { content }
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: focusedField) { _ in revealField(using: proxy) }
                .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardDidShowNotification)) { _ in
                    // The keyboard's final safe-area inset is available only after presentation.
                    revealField(using: proxy)
                }
        }
    }
    private func revealField(using proxy: ScrollViewProxy) {
        guard let focusedField else { return }
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
            proxy.scrollTo(focusedField, anchor: .center)
        }
    }
}
