import SwiftUI
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

struct EventCell: View {
    let event: CalendarEvent
    let currency: String
    var logos: LogoService? = nil
    var showDate = true
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            if let logos { BrandIcon(name: event.name, domain: event.domain, logos: logos, size: 36, dimmed: event.kind == .ends) }
            VStack(alignment: .leading, spacing: 4) {
                Text(event.name).appFont(15, weight: .semibold).lineLimit(typeSize.isAccessibilitySize ? nil : 1)
                Label(Display.event(event.kind) + (showDate ? " · " + Display.when(event.date) : ""), systemImage: eventIcon)
                    .appFont(12.5).foregroundStyle(event.kind == .resumes ? AppTheme.accent : AppTheme.muted)
                if typeSize.isAccessibilitySize { amount }
            }.frame(maxWidth: .infinity, alignment: .leading)
            if !typeSize.isAccessibilitySize { amount }
        }.foregroundStyle(AppTheme.text).frame(minHeight: 44).accessibilityElement(children: .combine)
    }
    private var amount: some View {
        Text(Display.money(event.amount, currency)).appFont(14, weight: .bold).monospacedDigit().fixedSize(horizontal: true, vertical: false)
            .strikethrough(event.kind == .ends).foregroundStyle(event.kind == .ends ? AppTheme.muted : AppTheme.text)
            .accessibilityLabel(event.kind == .ends ? L("home_attnStops", ["amount": Display.money(event.amount, currency)]) : Display.money(event.amount, currency))
    }
    private var eventIcon: String {
        switch event.kind {
        case .trialEnds: "hourglass"
        case .introEnds: "tag"
        case .priceChange: "arrow.up.right"
        case .payment: "arrow.triangle.2.circlepath"
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
    let add: () -> Void
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "repeat.circle").font(.system(size: 48)).foregroundStyle(.tint)
            Text(L("native_noSubscriptions")).font(.title2.bold())
            Text(L("native_emptyBody")).foregroundStyle(.secondary)
            Button(L("subs_add"), action: add).buttonStyle(.borderedProminent).foregroundStyle(.black).controlSize(.large).accessibilityIdentifier("addSubscription")
        }.multilineTextAlignment(.center).padding(32).frame(maxWidth: .infinity)
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
