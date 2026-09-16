import SwiftUI
import SubEyeCore

struct SubscriptionDetail: View {
    let id: String
    @Binding var state: SceneState
    let services: AppServices
    @Binding var sheet: SheetRoute?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var delete = false
    @State private var heroBottom: CGFloat = 300
    private var row: SubscriptionRow? { state.presentation.rows.first { $0.id == id } }
    private var currency: String { state.presentation.preferences.preferredCurrency }
    var body: some View {
        Group {
            if let row {
                GeometryReader { geometry in
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        hero(row).padding(.horizontal, -16)
                            .background { GeometryReader { heroGeometry in Color.clear.preference(key: HeroBottomKey.self, value: heroGeometry.frame(in: .named("subscriptionDetail")).maxY) } }
                        if let upcoming = row.upcoming { pending(upcoming, row: row) }
                        if let date = displayDate(row), row.status != .cancelled { paymentCard(row, date: date) }
                        if row.status.isCurrent, state.presentation.dashboard.monthly > 0 { shareCard(row) }
                        if !row.phases.isEmpty {
                            if state.settings.pro { history(row) }
                            else { timelineLock }
                        }
                        if let category = row.category {
                            AppSection { SettingsRow(icon: "tag", title: L("form_category"), value: category.emoji + " " + category.name, chevron: false) }
                        }
                        if let notes = row.subscription.notes, !notes.isEmpty {
                            AppSection(title: L("native_notes")) { Text(notes).appFont(15).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading).padding(16) }
                        }
                        if row.status == .cancelled {
                            VStack(spacing: 12) {
                                Text(L("detail_endedBody")).appFont(14).foregroundStyle(AppTheme.muted)
                                Button(L("native_action_restart")) { perform(.restart, row: row) }.buttonStyle(AppPrimaryButtonStyle())
                            }.padding(18).appCard()
                        }
                    }.padding(.horizontal, 16).padding(.bottom, 24)
                }.coordinateSpace(name: "subscriptionDetail")
                    .onPreferenceChange(HeroBottomKey.self) { heroBottom = $0 }
                    .background(alignment: .top) {
                        BrandWash(domain: row.subscription.brandDomain, logos: services.logos)
                            .frame(height: max(0, heroBottom + geometry.safeAreaInsets.top))
                            .clipShape(UnevenRoundedRectangleCompat(radius: 28))
                            .offset(y: -geometry.safeAreaInsets.top)
                    }
                    .appScreen().navigationTitle(typeSize.isAccessibilitySize ? L("native_subscriptionTitle") : "")
                    .toolbarBackground(.hidden, for: .navigationBar)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Menu {
                                if row.allowedActions.contains(.edit) {
                                    Button { sheet = .editor(row.subscription) } label: { Label(L("native_action_edit"), systemImage: "pencil") }.accessibilityIdentifier("editSubscription")
                                }
                                ForEach(row.allowedActions.filter { $0 != .edit && $0 != .delete }, id: \.self) { action in
                                    Button { perform(action, row: row) } label: { Label(L("native_action_" + action.rawValue), systemImage: icon(action)) }
                                }
                                Button(L("native_delete"), role: .destructive) { delete = true }.accessibilityIdentifier("deleteSubscription")
                            } label: { Label(L("detail_moreActions"), systemImage: "ellipsis") }.tint(AppTheme.text).accessibilityIdentifier("subscriptionActions")
                        }
                    }
                }
            } else { Text(L("common_loadFailed")) }
        }
        .task(id: id) {
            do { try await services.repository.settleDetail(id: id, now: Date()); state.reload += 1 }
            catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
        }
        .sheet(isPresented: $delete) {
            ConfirmAction(title: L("native_deleteSubscription"), message: L("native_deleteBody"), destructive: true) {
                try await services.repository.deleteSubscription(id: id); state.reload += 1; dismiss()
            }
        }
    }
    private func hero(_ row: SubscriptionRow) -> some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 10)) : AnyLayout(HStackLayout(spacing: 0))
        return VStack(spacing: 0) {
            BrandIcon(name: row.subscription.name, domain: row.subscription.brandDomain, logos: services.logos, size: 108, dimmed: row.status == .cancelled)
            Text(row.subscription.name).appFont(26, weight: .heavy, relativeTo: .title).tracking(-0.6).multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true).padding(.top, 14).accessibilityIdentifier("subscriptionDetailName")
            if row.status == .cancelled, let date = row.subscription.willBeCancelledAt.flatMap(Day.parse) {
                Text(L("detail_heroEnded", ["date": Display.date(date)])).appFont(13, weight: .semibold).foregroundStyle(AppTheme.muted).padding(.top, 4)
            }
            layout {
                segment(L("detail_segBilling"), value: Display.cadence(row.subscription).localizedCapitalized)
                if typeSize.isAccessibilitySize { AppDivider() } else { Rectangle().fill(Color.white.opacity(0.18)).frame(width: 0.5, height: 32) }
                segment(row.subscription.currency.lowercased() == currency.lowercased() ? L("detail_segAmount") : Display.money(Double(row.subscription.cost) ?? 0, row.subscription.currency), value: Display.money(row.amount, currency))
                if typeSize.isAccessibilitySize { AppDivider() } else { Rectangle().fill(Color.white.opacity(0.18)).frame(width: 0.5, height: 32) }
                segment(L("detail_segStatus"), value: L("subs_status_" + row.status.rawValue), color: row.status == .active ? AppTheme.accentBright : row.status == .cancelled ? AppTheme.muted : AppTheme.warning)
            }.padding(.vertical, 10).padding(.horizontal, 4)
                .appCard(radius: typeSize.isAccessibilitySize ? 20 : 999, fill: AppTheme.surface.opacity(0.8), border: Color.white.opacity(0.14)).padding(.top, 18)
        }.padding(.horizontal, 18).padding(.top, 8).padding(.bottom, 18).frame(maxWidth: .infinity)
    }
    private var timelineLock: some View {
        Button { sheet = .paywall } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack { Text(L("paywall_lockTimeline")).appFont(16, weight: .semibold); Spacer(); Label(L("paywall_badge"), systemImage: "lock.fill").appFont(11, weight: .bold).foregroundStyle(AppTheme.accentBright) }
                Text(L("paywall_lockTimelineBody")).appFont(13.5).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true)
            }.padding(18).appCard()
        }.buttonStyle(.plain)
    }
    private func segment(_ title: String, value: String, color: Color = AppTheme.text) -> some View {
        VStack(alignment: typeSize.isAccessibilitySize ? .leading : .center, spacing: 3) {
            Text(value).appFont(15, weight: .bold).foregroundStyle(color).lineLimit(typeSize.isAccessibilitySize ? nil : 1).minimumScaleFactor(0.74)
            Text(title.uppercased()).appFont(10.5, weight: .semibold, relativeTo: .caption2).tracking(0.5).foregroundStyle(AppTheme.muted)
        }.frame(maxWidth: .infinity, alignment: typeSize.isAccessibilitySize ? .leading : .center).padding(.horizontal, 8).accessibilityElement(children: .combine)
    }
    private func paymentCard(_ row: SubscriptionRow, date: Date) -> some View {
        let ending = row.status == .cancelling
        let days = max(0, Day.utc.dateComponents([.day], from: Day.today(), to: date).day ?? 0)
        return VStack(alignment: .leading, spacing: 8) {
            let headerLayout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8)) : AnyLayout(HStackLayout())
            headerLayout {
                AppCaption(title: L(ending ? "detail_ends" : row.status == .paused ? "detail_resumes" : "detail_nextPayment"))
                if !typeSize.isAccessibilitySize { Spacer() }
                if !state.settings.reminders.renewals && !ending {
                    NavigationLink(value: Route.notifications) { Label(L("detail_remindOffer"), systemImage: "bell.badge").appFont(11.5, weight: .semibold).foregroundStyle(AppTheme.accentBright) }.buttonStyle(.plain)
                }
            }
            Text(ending ? L("when_daysLeft", ["days": String(days)]) : Display.money(row.nextAmount ?? row.amount, currency))
                .appFont(26, weight: .heavy, relativeTo: .title).tracking(-0.6).monospacedDigit()
                .accessibilityLabel(ending ? L("when_daysLeft", ["days": String(days)]) : L("detail_nextPayment") + ", " + Display.money(row.nextAmount ?? row.amount, currency))
            Text((ending ? "" : Display.when(date, countdown: true) + " · ") + Display.date(date, long: true)).appFont(13).foregroundStyle(AppTheme.muted)
            if row.status.isCurrent {
                // Recurrence owns the anchor; this is only the visible progress between its two dates.
                let anchor = Day.parse(row.subscription.paymentDate) ?? date
                let index = Recurrence.nextIndex(anchor: anchor, every: row.subscription.every, period: row.subscription.period, onOrAfter: date)
                let previous = Recurrence.occurrence(anchor: anchor, every: row.subscription.every, period: row.subscription.period, index: max(0, index - 1))
                let span = date.timeIntervalSince(previous)
                SpendTrack(progress: span > 0 ? 1 - date.timeIntervalSince(Day.today()) / span : 0, height: 6).padding(.top, 4)
            }
            if ending { Text(L(row.nextAmount == nil ? "detail_endsNoCharges" : "detail_endsNextCharge", ["date": row.nextDate.map { Display.date($0) } ?? ""])).appFont(12.5).foregroundStyle(AppTheme.muted) }
        }.padding(18).appCard()
    }
    private func shareCard(_ row: SubscriptionRow) -> some View {
        let total = state.presentation.dashboard.monthly
        let share = min(1, row.monthly / total)
        return VStack(alignment: .leading, spacing: 12) {
            let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8)) : AnyLayout(HStackLayout())
            layout { AppCaption(title: L("detail_spendShare")); if !typeSize.isAccessibilitySize { Spacer() }; Text("\(Int((share * 100).rounded()))%").appFont(15, weight: .bold) }.accessibilityElement(children: .combine)
            SpendTrack(progress: share, height: 6)
            Text(L("detail_spendShareOf", ["amount": Display.money(row.monthly, currency), "total": Display.money(total, currency, decimals: 0)])).appFont(12.5).foregroundStyle(AppTheme.muted)
        }.padding(18).appCard()
    }
    private func history(_ row: SubscriptionRow) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            AppCaption(title: L("detail_timeline")).padding(.bottom, 12)
            ForEach(Array(row.phases.sorted { $0.startsAt > $1.startsAt }.enumerated()), id: \.element.id) { index, phase in
                if index > 0 { AppDivider().padding(.leading, 26) }
                HStack(alignment: .top, spacing: 14) {
                    Circle().fill(index == 0 ? AppTheme.accent : AppTheme.muted).frame(width: 8, height: 8).padding(.top, 5)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(L("native_phase_" + phase.kind.rawValue)).appFont(15, weight: .semibold)
                        Text(Display.date(Day.parse(phase.startsAt)!) + (phase.endsAt.flatMap(Day.parse).map { " – " + Display.date($0) } ?? "")).appFont(12.5).foregroundStyle(AppTheme.muted)
                        if typeSize.isAccessibilitySize { Text(Display.money(Double(phase.cost) ?? 0, phase.currency)).appFont(14, weight: .bold) }
                    }.frame(maxWidth: .infinity, alignment: .leading)
                    if !typeSize.isAccessibilitySize { Text(Display.money(Double(phase.cost) ?? 0, phase.currency)).appFont(14, weight: .bold) }
                }.padding(.vertical, 12).accessibilityElement(children: .combine)
            }
        }.padding(18).appCard()
    }
    private func pending(_ upcoming: PricePhase, row: SubscriptionRow) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(L("pricing_pendingTitle"), systemImage: "exclamationmark.triangle").appFont(14, weight: .semibold).foregroundStyle(AppTheme.warning)
            Text(Display.money(Double(upcoming.cost) ?? 0, upcoming.currency) + " · " + Display.date(Day.parse(upcoming.startsAt)!)).appFont(13)
            if state.settings.pro {
                ActionButton(title: L("native_applyNow")) { try await services.repository.managePhase(subscriptionId: id, phaseId: upcoming.id, apply: true, now: Date()); state.reload += 1 }
                ActionButton(title: L("native_removePending"), role: .destructive) { try await services.repository.managePhase(subscriptionId: id, phaseId: upcoming.id, apply: false, now: Date()); state.reload += 1 }
            }
        }.padding(16).frame(maxWidth: .infinity, alignment: .leading).appCard(radius: 18, fill: AppTheme.warning.opacity(0.10), border: AppTheme.warning.opacity(0.3))
    }
    private func displayDate(_ row: SubscriptionRow) -> Date? {
        row.status == .cancelling ? row.subscription.willBeCancelledAt.flatMap(Day.parse) : row.status == .paused ? row.subscription.resumeAt.flatMap(Day.parse) : row.nextDate
    }
    private func perform(_ action: LifecycleAction, row: SubscriptionRow) {
        if action == .pricing { sheet = state.settings.pro ? .pricing(row) : .paywall }
        else if action == .cancel { sheet = .cancellation(id) }
        else { sheet = .lifecycle(row, action) }
    }
    private func icon(_ action: LifecycleAction) -> String {
        switch action {
        case .edit: "pencil"
        case .pricing: "tag"
        case .pause: "pause.circle"
        case .resume: "play.circle"
        case .cancel: "xmark.circle"
        case .keep, .restart: "arrow.clockwise"
        case .delete: "trash"
        }
    }
}

private struct HeroBottomKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = max(value, nextValue()) }
}

struct BrandWash: View {
    let domain: String?
    let logos: LogoService
    @State private var image: UIImage?
    var body: some View {
        GeometryReader { geometry in
            if let image {
                Image(uiImage: image).resizable().scaledToFill().frame(width: geometry.size.width, height: geometry.size.height)
                    .saturation(2.6).brightness(-0.15).blur(radius: 40).scaleEffect(2.6)
            }
            LinearGradient(stops: [.init(color: AppTheme.background.opacity(0.4), location: 0), .init(color: AppTheme.background.opacity(0.72), location: 0.52), .init(color: AppTheme.background, location: 1)], startPoint: .top, endPoint: .bottom)
        }.background(AppTheme.surface).clipped().accessibilityHidden(true)
            .task(id: domain) {
                guard let domain else { image = nil; return }
                let variant = await logos.variant(for: domain)
                if let cached = await logos.cached(domain: domain, variant: variant), let bytes = cached.bytes {
                    image = UIImage(data: bytes)
                }
                let payload = await logos.load(domain: domain, variant: variant)
                guard !Task.isCancelled else { return }
                image = payload?.bytes.flatMap(UIImage.init(data:))
            }
    }
}

private struct UnevenRoundedRectangleCompat: Shape {
    var radius: CGFloat
    func path(in rect: CGRect) -> Path {
        Path(UIBezierPath(roundedRect: rect, byRoundingCorners: [.bottomLeft, .bottomRight], cornerRadii: CGSize(width: radius, height: radius)).cgPath)
    }
}

struct ConfirmAction: View {
    let title: String
    let message: String
    var destructive = false
    let action: @MainActor () async throws -> Void
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            Form {
                Text(message)
                ActionButton(title: L("native_confirm"), role: destructive ? .destructive : nil) { try await action(); dismiss() }.accessibilityIdentifier("confirmAction")
            }.navigationTitle(title).navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button(L("common_cancel")) { dismiss() } } }
        }.presentationDetents([.medium, .large])
    }
}

struct LifecycleView: View {
    let row: SubscriptionRow
    let action: LifecycleAction
    @Binding var state: SceneState
    let services: AppServices
    @Environment(\.dismiss) private var dismiss
    @State private var immediate = false
    @State private var timed = false
    @State private var date = Day.today()
    var body: some View {
        NavigationStack {
            Form {
                HStack(spacing: 12) {
                    BrandIcon(name: row.subscription.name, domain: row.subscription.brandDomain, logos: services.logos)
                    Text(row.subscription.name).font(.headline)
                }
                if action == .cancel {
                    Text(L("native_cancellationBody"))
                    if let link = ProviderCancellation.url(row.subscription.brandDomain) { Link(L("native_provider"), destination: link) }
                    else if let domain = row.subscription.brandDomain, let link = URL(string: "https://" + domain) { Link(L("native_providerSite"), destination: link) }
                    Picker(L("native_date"), selection: $immediate) { Text(L("native_periodEnd")).tag(false); Text(L("native_immediately")).tag(true) }
                }
                if action == .pause {
                    Toggle(L("native_resumeDate"), isOn: $timed)
                    if timed { DatePicker(L("detail_resumes"), selection: $date, in: Day.shift(Day.today(), days: 1)..., displayedComponents: .date).environment(\.timeZone, .gmt) }
                }
                if action == .restart { DatePicker(L("native_date"), selection: $date, in: ...Day.today(), displayedComponents: .date).environment(\.timeZone, .gmt) }
                ActionButton(title: L("native_confirm")) {
                    let day = action == .restart || (action == .pause && timed) ? Day.floor(date) : nil
                    try await services.repository.transition(id: row.id, action: action, day: day, immediate: immediate, now: Date())
                    state.reload += 1; dismiss()
                }.accessibilityIdentifier("confirmLifecycle")
            }.navigationTitle(L("native_action_" + action.rawValue)).navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button(L("common_cancel")) { dismiss() } } }
        }
    }
}

enum ProviderCancellation {
    static func url(_ domain: String?) -> URL? {
        let known = ["netflix.com": "https://www.netflix.com/cancelplan", "spotify.com": "https://www.spotify.com/account/subscription/", "youtube.com": "https://www.youtube.com/paid_memberships", "icloud.com": "https://support.apple.com/118428", "music.apple.com": "https://apps.apple.com/account/subscriptions", "adobe.com": "https://account.adobe.com/plans"]
        return domain.flatMap { known[$0] }.flatMap(URL.init(string:))
    }
}
