import SwiftUI
import SubEyeCore
import UserNotifications

struct SubscriptionDetail: View {
    let id: String
    @Binding var state: SceneState
    let services: AppServices
    @Binding var sheet: SheetRoute?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.openURL) private var openURL
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var delete = false
    @State private var deletion: UUID?
    @State private var heroBottom: CGFloat = 300
    @State private var rates: ExchangeRates?
    @State private var reminderSet = false
    @State private var enabling: UUID?
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
                        if let date = displayDate(row), row.status != .cancelled {
                            PaymentCard(row: row, date: date, currency: currency, rates: rates, editable: state.settings.pro, logos: services.logos,
                                        cancel: { sheet = .cancellation(id) }, manage: { phase, apply in await managePhase(phase, apply: apply) })
                        }
                        if let share = share(row) { shareCard(row, share: share) }
                        details(row)
                        if !row.phases.isEmpty {
                            if state.settings.pro { history(row) }
                            else { timelineLock }
                        }
                        if let notes = row.subscription.notes, !notes.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                caption(L("native_notes"))
                                Text(notes).appFont(15).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading).padding(16).appCard()
                            }.padding(.top, 8)
                        }
                        if row.status == .cancelled {
                            VStack(spacing: 12) {
                                if let saved = state.presentation.dashboard.savings?.sinceEnded[row.id], saved > 0 {
                                    Text(L("detail_savedSinceEnded", ["amount": Display.money(saved, currency)])).appFont(16, weight: .semibold).foregroundStyle(AppTheme.accentBright)
                                }
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
                            .offset(y: -geometry.safeAreaInsets.top)
                    }
                    .appScreen().navigationTitle(typeSize.isAccessibilitySize ? L("native_subscriptionTitle") : "")
                    .toolbarBackground(.hidden, for: .navigationBar)
                    .toolbar {
                        if reminderSet && reminded(row) || reminderOffer(row) != nil {
                            ToolbarItem(placement: .topBarTrailing) {
                                ReminderBell(title: reminderSet ? reminderConfirmation : reminderOffer(row) ?? "", done: reminderSet) { if !reminderSet && enabling == nil { enabling = UUID() } }
                            }
                        }
                        ToolbarItem(placement: .topBarTrailing) {
                            Menu {
                                if row.allowedActions.contains(.edit) {
                                    Button { sheet = .editor(row.subscription) } label: { Label(L("native_action_edit"), systemImage: "pencil") }.accessibilityIdentifier("editSubscription")
                                }
                                ForEach(row.allowedActions.filter { $0 != .edit && $0 != .delete }, id: \.self) { action in
                                    Button { perform(action, row: row) } label: { Label(L(action == .cancel ? "action_cancel" : "native_action_" + action.rawValue), systemImage: icon(action)) }
                                }
                                Section {
                                    Button(role: .destructive) { delete = true } label: {
                                        DestructiveMenuLabel(title: L("native_delete"))
                                    }.accessibilityIdentifier("deleteSubscription")
                                }
                            } label: { Label(L("detail_moreActions"), systemImage: "ellipsis") }.tint(AppTheme.text).disabled(deletion != nil).accessibilityIdentifier("subscriptionActions")
                        }
                    }
                }
            } else { Text(L("common_loadFailed")) }
        }
        .task(id: enabling) {
            guard enabling != nil else { return }
            defer { enabling = nil }
            if await services.notifications.permission() == .denied { openURL(URL(string: UIApplication.openSettingsURLString)!); return }
            var reminders = state.settings.reminders
            reminders.renewals = true
            let motion: Animation? = reduceMotion ? nil : .easeInOut(duration: 0.25)
            do {
                // Saved before the permission prompt: the prompt cycles the scene, and the refresh that follows must already read it.
                try await services.repository.setSetting("notifications.settings", value: reminders)
                _ = try await services.notifications.authorize()
                let allowed = await services.notifications.allowed()
                withAnimation(motion) {
                    state.settings.reminders = reminders; state.notificationsAllowed = allowed; reminderSet = allowed
                }
                state.reload += 1
            } catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)); return }
            guard reminderSet else { return }
            try? await Task.sleep(for: .seconds(1.2))
            withAnimation(motion) { reminderSet = false }
        }
        .task(id: id) {
            do {
                let rates = try await services.exchange.cached()
                self.rates = rates
                try await services.repository.settleDetail(id: id, rates: rates, now: Date()); state.reload += 1
            } catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
        }
        .alert(L("native_deleteSubscription"), isPresented: $delete) {
            Button(L("native_delete"), role: .destructive) { deletion = UUID() }.accessibilityIdentifier("confirmAction")
            Button(L("common_cancel"), role: .cancel) {}.accessibilityIdentifier("cancelDeletion")
        } message: { Text(deleteMessage) }
        .task(id: deletion) {
            guard deletion != nil else { return }
            do { try await services.repository.deleteSubscription(id: id); state.reload += 1; dismiss() }
            catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)); deletion = nil }
        }
    }
    private var deleteMessage: String {
        guard let saved = state.presentation.dashboard.savings?.subscriptions[id], saved > 0 else { return L("native_deleteBody") }
        return L("native_deleteBody") + " " + L("native_deleteSavings", ["amount": Display.money(saved, currency)])
    }
    private func hero(_ row: SubscriptionRow) -> some View {
        VStack(spacing: 0) {
            BrandIcon(name: row.subscription.name, domain: row.subscription.brandDomain, logos: services.logos, size: 80, dimmed: row.status == .cancelled)
            Text(row.subscription.name).appFont(24, weight: .bold, relativeTo: .title).tracking(-0.4).multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true).padding(.top, 14).accessibilityIdentifier("subscriptionDetailName")
            Text(subtitle(row)).appFont(15).foregroundStyle(AppTheme.muted).monospacedDigit().multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true).padding(.top, 4)
            if let badge = statusBadge(row) {
                Text(badge.title).appFont(13, weight: .semibold).foregroundStyle(badge.color)
                    .padding(.horizontal, 11).padding(.vertical, 4).frame(minHeight: 26)
                    .background(badge.color.opacity(0.14), in: Capsule()).padding(.top, 12)
            }
        }.padding(.horizontal, 24).padding(.top, 4).padding(.bottom, 12).frame(maxWidth: .infinity)
    }
    private func subtitle(_ row: SubscriptionRow) -> String {
        let subscription = row.subscription
        if let paid = paidAfterTrial(row) { return L("detail_trialThen", ["price": perPeriod(paid.cost, paid.currency, subscription)]) }
        let native = perPeriod(subscription.cost, subscription.currency, subscription)
        guard subscription.currency.lowercased() != currency.lowercased(), row.amount > 0 else { return native }
        return native + " · " + Display.money(row.amount, currency)
    }
    private func statusBadge(_ row: SubscriptionRow) -> (title: String, color: Color)? {
        switch row.status {
        case .active: nil
        case .cancelling, .paused: (L("subs_status_" + row.status.rawValue), AppTheme.warning)
        case .cancelled: (row.subscription.willBeCancelledAt.flatMap(Day.parse).map { L("detail_heroEnded", ["date": Display.date($0)]) } ?? L("subs_status_cancelled"), AppTheme.muted)
        }
    }
    private func paidAfterTrial(_ row: SubscriptionRow) -> PricePhase? {
        guard row.effectiveKind == .trial, let next = row.upcoming, next.kind != .trial, next.kind != .intro else { return nil }
        return next
    }
    private func caption(_ title: String) -> some View {
        Text(title).appFont(13, weight: .medium, relativeTo: .footnote).foregroundStyle(AppTheme.muted)
            .fixedSize(horizontal: false, vertical: true).padding(.horizontal, 18).accessibilityAddTraits(.isHeader)
    }
    // Renewal reminders also cover a trial's first paid charge; trial reminders count only where the planner keeps them, on Pro.
    private func reminded(_ row: SubscriptionRow) -> Bool {
        let reminders = state.settings.reminders
        let covered = reminders.renewals || (paidAfterTrial(row) != nil && state.settings.pro && reminders.trials)
        return covered && state.notificationsAllowed == true
    }
    private func reminderOffer(_ row: SubscriptionRow) -> String? {
        guard row.status == .active || row.status == .paused, state.notificationsAllowed != nil, !reminded(row) else { return nil }
        return L(paidAfterTrial(row) != nil ? "detail_remindTrial" : "detail_remindRenewal")
    }
    private var reminderConfirmation: String {
        let lead = ReminderSettings.leads(state.settings.reminders.renewalLeadDays, fallback: [1]).max() ?? 1
        let label = L([0: "notifs_leadSameDay", 1: "notifs_leadOneDay", 3: "notifs_leadThreeDays", 7: "notifs_leadOneWeek"][state.settings.pro ? lead : 1]!)
        return L("detail_reminderOn", ["lead": label.prefix(1).lowercased() + label.dropFirst()])
    }
    private func share(_ row: SubscriptionRow) -> Double? {
        let total = state.presentation.dashboard.monthly
        guard row.status == .active, row.nextAmount != nil, total > 0 else { return nil }
        let share = min(1, row.monthly / total)
        return (share * 100).rounded() >= 1 ? share : nil
    }
    private func shareCard(_ row: SubscriptionRow, share: Double) -> some View {
        HStack(spacing: 14) {
            ZStack {
                Circle().stroke(AppTheme.surfaceAlt, lineWidth: 6)
                Circle().trim(from: 0, to: share).stroke(AppTheme.text, style: StrokeStyle(lineWidth: 6, lineCap: .round)).rotationEffect(.degrees(-90))
                Text("\(Int((share * 100).rounded()))%").font(.system(size: 13, weight: .bold)).monospacedDigit().minimumScaleFactor(0.6).lineLimit(1).padding(.horizontal, 6)
            }.frame(width: 44, height: 44).padding(4)
            VStack(alignment: .leading, spacing: 2) {
                Text(L("detail_spendShare")).appFont(15, weight: .semibold)
                Text(L("detail_spendShareOf", ["amount": Display.money(row.monthly, currency), "total": Display.money(state.presentation.dashboard.monthly, currency, decimals: 0)]))
                    .appFont(13).foregroundStyle(AppTheme.muted).monospacedDigit()
            }.fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
        }.padding(.horizontal, 18).padding(.vertical, 14).appCard().accessibilityElement(children: .combine)
    }
    private func details(_ row: SubscriptionRow) -> some View {
        let subscription = row.subscription
        let trialStart = paidAfterTrial(row) != nil ? Pricing.effective(row.phases, at: Date()).flatMap { Day.parse($0.startsAt) } : nil
        let tracked = Day.parse(subscription.createdAt)
        return AppSection {
            detailRow(L("detail_segBilling"), value: sentence(Display.cadence(subscription)))
            AppDivider(inset: 18)
            detailRow(L("form_price"), value: priceValue(row))
            if let trialStart {
                AppDivider(inset: 18)
                detailRow(L("detail_trialStarted"), value: Display.date(trialStart))
            } else if let tracked {
                AppDivider(inset: 18)
                detailRow(L("detail_trackedSince"), value: Display.date(tracked))
            }
            if let category = row.category {
                AppDivider(inset: 18)
                detailRow(L("form_category"), value: category.emoji + " " + category.name)
            }
        }
    }
    private func detailRow(_ title: String, value: String) -> some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4)) : AnyLayout(HStackLayout(spacing: 16))
        return layout {
            Text(title).fixedSize(horizontal: false, vertical: true)
            if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
            Text(value).foregroundStyle(AppTheme.muted).monospacedDigit().multilineTextAlignment(typeSize.isAccessibilitySize ? .leading : .trailing).fixedSize(horizontal: false, vertical: true)
        }.appFont(15).padding(.horizontal, 18).padding(.vertical, 12).frame(minHeight: 48).accessibilityElement(children: .combine)
    }
    private func priceValue(_ row: SubscriptionRow) -> String {
        if let paid = paidAfterTrial(row) {
            return L("detail_freeThen", ["price": dual(paid.cost, paid.currency, converted: rates?.convert(Double(paid.cost) ?? 0, from: paid.currency, to: currency))])
        }
        return dual(row.subscription.cost, row.subscription.currency, converted: row.amount)
    }
    private func dual(_ cost: String, _ code: String, converted: Double?) -> String {
        let native = price(cost, code)
        guard (Double(cost) ?? 0) > 0, code.lowercased() != currency.lowercased(), let converted else { return native }
        return native + " · " + Display.money(converted, currency)
    }
    private var timelineLock: some View {
        Button { sheet = .paywall } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 8) {
                        Text(L("paywall_lockTimeline")).appFont(15, weight: .semibold)
                        Text(L("paywall_badge").uppercased()).appFont(11, weight: .bold, relativeTo: .caption2).foregroundStyle(AppTheme.accentBright)
                            .padding(.horizontal, 7).padding(.vertical, 2).background(AppTheme.accentBright.opacity(0.14), in: Capsule())
                    }
                    Text(L("paywall_lockTimelineBody")).appFont(13).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true)
                }.frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "chevron.right").appFont(13, weight: .semibold).foregroundStyle(AppTheme.muted).accessibilityHidden(true)
            }.padding(.leading, 18).padding(.trailing, 14).padding(.vertical, 14).appCard().contentShape(Rectangle())
        }.buttonStyle(.plain).padding(.top, 8).accessibilityIdentifier("timelineLock")
    }
    private func history(_ row: SubscriptionRow) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            caption(L("detail_timeline"))
            VStack(spacing: 0) {
                ForEach(Array(historyEntries(row).enumerated()), id: \.element.id) { index, entry in
                    if index > 0 { AppDivider(inset: 42) }
                    HStack(spacing: 12) {
                        ToneIcon(symbol: entry.symbol, tone: entry.tone)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(entry.title).appFont(15, weight: .semibold)
                            Text(entry.detail).appFont(13).foregroundStyle(AppTheme.muted)
                            if typeSize.isAccessibilitySize { figures(entry, alignment: .leading) }
                        }.fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
                        if !typeSize.isAccessibilitySize { figures(entry, alignment: .trailing) }
                    }.padding(.vertical, 10).frame(minHeight: 62).accessibilityElement(children: .combine)
                }
            }.padding(.horizontal, 18).appCard()
        }.padding(.top, 8)
    }
    private func figures(_ entry: HistoryEntry, alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: 2) {
            Text(entry.price).appFont(15, weight: .semibold)
            if let delta = entry.delta { Text(delta).appFont(13, weight: .semibold).foregroundStyle(entry.tone ?? AppTheme.muted) }
        }.monospacedDigit()
    }
    // Newest first. The current price is the base the scheduled rows are measured against, so it never carries a delta itself.
    private func historyEntries(_ row: SubscriptionRow) -> [HistoryEntry] {
        let now = Date(), subscription = row.subscription
        let current = Pricing.effective(row.phases, at: now)
        let ordered = row.phases.sorted { (Day.parse($0.startsAt) ?? .distantPast) < (Day.parse($1.startsAt) ?? .distantPast) }
        var points: [(phase: PricePhase?, cost: String, currency: String)] = ordered.filter { (Day.parse($0.startsAt) ?? .distantPast) <= now }.map { ($0, $0.cost, $0.currency) }
        if current == nil { points.append((nil, subscription.cost, subscription.currency)) }
        points += ordered.filter { (Day.parse($0.startsAt) ?? .distantPast) > now }.map { ($0, $0.cost, $0.currency) }
        var entries: [HistoryEntry] = []
        for (index, point) in points.enumerated() {
            let value = Double(point.cost) ?? 0
            let previous = index > 0 ? points[index - 1] : nil
            // Across a currency switch the step is measured in the preferred currency, so a rise never reads as no change.
            let step: (amount: Double, currency: String)? = previous.flatMap { prior in
                if prior.currency.lowercased() == point.currency.lowercased() { return (value - (Double(prior.cost) ?? 0), point.currency) }
                guard let rates, let new = rates.converted(value, from: point.currency, to: currency),
                      let old = rates.converted(Double(prior.cost) ?? 0, from: prior.currency, to: currency) else { return nil }
                return ((new - old) * 100).rounded() == 0 ? nil : (new - old, currency)
            }
            let difference = step?.amount ?? 0
            let start = point.phase.flatMap { Day.parse($0.startsAt) } ?? Day.parse(subscription.createdAt)
            if point.phase == nil || point.phase?.id == current?.id {
                entries.append(HistoryEntry(id: point.phase?.id ?? "current", symbol: "tag", tone: nil, title: L("detail_historyCurrent"),
                                            detail: start.map { L("detail_historySince", ["date": Display.date($0)]) } ?? "", price: price(point.cost, point.currency), delta: nil))
                continue
            }
            guard let phase = point.phase, let start else { continue }
            let future = start > now
            let detail = future ? L("detail_historyScheduled", ["date": Display.date(start)])
                : Display.date(start) + (phase.endsAt.flatMap(Day.parse).map { " – " + Display.date($0) } ?? "")
            let offer = phase.kind == .standard ? previous?.phase?.kind : nil
            if future, offer == .trial {
                entries.append(HistoryEntry(id: phase.id, symbol: "hourglass", tone: AppTheme.warning, title: L("calendar_kindTrialEnds"),
                                            detail: detail, price: price(phase.cost, phase.currency), delta: nil))
                continue
            }
            let title: String
            if future, offer == .intro { title = L("calendar_kindIntroEnds") }
            else if future, phase.kind == .scheduledChange || phase.kind == .standard {
                title = L(difference > 0 ? "detail_historyUp" : difference < 0 ? "detail_historyDown" : "calendar_kindPriceChange")
            } else { title = L("native_phase_" + phase.kind.rawValue) }
            entries.append(HistoryEntry(id: phase.id, symbol: difference > 0 ? "arrow.up.right" : difference < 0 ? "arrow.down.right" : "tag",
                                        tone: difference > 0 ? AppTheme.warning : difference < 0 ? AppTheme.accentBright : nil,
                                        title: title, detail: detail, price: price(phase.cost, phase.currency),
                                        delta: difference == 0 ? nil : (difference > 0 ? "+" : "−") + Display.money(abs(difference), step?.currency ?? phase.currency)))
        }
        return entries.reversed()
    }
    private func managePhase(_ phase: PricePhase, apply: Bool) async {
        do { try await services.repository.managePhase(subscriptionId: id, phaseId: phase.id, apply: apply, rates: try await services.exchange.cached(), now: Date()); state.reload += 1 }
        catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
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

private struct ReminderBell: View {
    let title: String
    let done: Bool
    let action: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var ring = 0
    var body: some View {
        Button(action: action) {
            symbol.foregroundStyle(done ? AppTheme.accentBright : AppTheme.text).frame(width: 30, height: 30).contentShape(Rectangle())
        }
        .accessibilityLabel(title).accessibilityIdentifier(done ? "reminderSet" : "remindMe")
        .task {
            guard !reduceMotion else { return }
            // After the push settles, so the cue reads as its own moment rather than part of the transition.
            try? await Task.sleep(for: .seconds(0.8))
            ring += 1
        }
    }
    @ViewBuilder private var symbol: some View {
        let image = Image(systemName: done ? "checkmark" : "bell")
        if #available(iOS 18, *) { image.symbolEffect(.wiggle, options: .repeat(2), value: ring).contentTransition(.symbolEffect(.replace)) }
        else if #available(iOS 17, *) { image.symbolEffect(.bounce, options: .repeat(2), value: ring).contentTransition(.symbolEffect(.replace)) }
        else { image }
    }
}

private struct HistoryEntry: Identifiable {
    let id: String
    let symbol: String
    let tone: Color?
    let title: String
    let detail: String
    let price: String
    let delta: String?
}

private func price(_ cost: String, _ currency: String) -> String {
    let value = Double(cost) ?? 0
    return value == 0 ? L("pricing_free") : Display.money(value, currency)
}

private func perPeriod(_ cost: String, _ currency: String, _ subscription: Subscription) -> String {
    guard (Double(cost) ?? 0) > 0 else { return L("pricing_free") }
    let amount = Display.money(Double(cost) ?? 0, currency)
    return subscription.every == 1 ? L("detail_per_" + subscription.period.rawValue, ["price": amount]) : amount + " " + Display.cadence(subscription)
}

private func sentence(_ text: String) -> String { text.prefix(1).uppercased() + text.dropFirst() }

private struct PaymentCard: View {
    let row: SubscriptionRow
    let date: Date
    let currency: String
    let rates: ExchangeRates?
    let editable: Bool
    let logos: LogoService
    let cancel: () -> Void
    let manage: @MainActor (PricePhase, Bool) async -> Void
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var confirming: Bool?
    @State private var running: Bool?
    @State private var fill: Color?
    private let secondary = Color.white.opacity(0.7)
    private var subscription: Subscription { row.subscription }
    private var ending: Bool { row.status == .cancelling }
    // An offer ends by its standard phase starting, so that phase reads as the offer ending, not as a new price.
    private var endsOffer: Bool { row.upcoming?.kind == .standard && (row.effectiveKind == .trial || row.effectiveKind == .intro) }

    private struct Note {
        var symbol: String
        var tone: Color?
        var title: String
        var line: String
        var phase: PricePhase? = nil
        var cancels = false
    }

    var body: some View {
        VStack(spacing: 0) {
            summary.padding(.horizontal, 20).padding(.top, 18).padding(.bottom, 16)
            if let note { panel(note).padding([.horizontal, .bottom], 10) }
        }
        .background(fill ?? AppTheme.surface, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
        .overlay { RoundedRectangle(cornerRadius: 28, style: .continuous).strokeBorder(Color.white.opacity(0.06), lineWidth: 1) }
        .modifier(LogoImage(domain: subscription.brandDomain, logos: logos) { fill = BrandTint.card($0) })
        .accessibilityElement(children: .contain).accessibilityIdentifier("paymentCard")
        .task(id: running) {
            guard let apply = running, let upcoming = row.upcoming else { return }
            await manage(upcoming, apply)
            running = nil
        }
    }

    private var summary: some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 10)) : AnyLayout(HStackLayout(alignment: .center, spacing: 12))
        return layout {
            VStack(alignment: .leading, spacing: 2) {
                Text(sentence(Display.when(date, countdown: true))).appFont(24, weight: .bold, relativeTo: .title).tracking(-0.5)
                Text(L(label)).appFont(13, weight: .medium).foregroundStyle(secondary)
            }.fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading).accessibilityElement(children: .combine)
            amounts
        }
    }

    private var label: String {
        if ending { return "detail_ends" }
        if row.status == .paused { return "detail_resumes" }
        return row.effectiveKind == .trial && (row.nextAmount ?? 0) > 0 ? "detail_firstPayment" : "detail_nextPayment"
    }

    private var amounts: some View {
        let leading = typeSize.isAccessibilitySize
        let amount = row.nextAmount ?? (ending ? nil : row.amount)
        return VStack(alignment: leading ? .leading : .trailing, spacing: 2) {
            if let amount {
                Text(amount == 0 ? L("pricing_free") : Display.money(amount, currency)).appFont(20, weight: .semibold)
                if ending, let next = row.nextDate {
                    Text(L("detail_endsNextCharge", ["date": Display.day(next)])).appFont(13).foregroundStyle(secondary)
                } else if amount > 0, let native { Text(native).appFont(13).foregroundStyle(secondary) }
            } else {
                Text(L("detail_endsNoCharges")).appFont(13).foregroundStyle(secondary)
            }
        }.monospacedDigit().multilineTextAlignment(leading ? .leading : .trailing).fixedSize(horizontal: false, vertical: true)
            .accessibilityElement(children: .combine)
    }

    private var native: String? {
        let phase = row.nextAmount != nil ? row.nextDate.flatMap { Pricing.effective(row.phases, at: $0) } : nil
        let code = phase?.currency ?? subscription.currency
        guard code.lowercased() != currency.lowercased() else { return nil }
        return Display.money(Double(phase?.cost ?? subscription.cost) ?? 0, code)
    }

    private var note: Note? {
        if ending {
            guard let rates, let end = subscription.willBeCancelledAt.flatMap(Day.parse) else { return nil }
            let yearly = Savings.annual(subscription, phases: row.phases, from: end, rates: rates, currency: currency)
            guard yearly > 0 else { return nil }
            return Note(symbol: "chart.line.downtrend.xyaxis", tone: AppTheme.accentBright,
                        title: L("detail_savesYearly", ["amount": Display.money(yearly, currency, decimals: 0)]),
                        line: L("detail_savingsFrom", ["date": Display.day(end)]))
        }
        guard let upcoming = row.upcoming, let start = Day.parse(upcoming.startsAt) else { return nil }
        let onPayment = row.nextDate.map(Day.key) == Day.key(start)
        let day = Display.day(start)
        let from = price(subscription.cost, subscription.currency), to = price(upcoming.cost, upcoming.currency)
        if upcoming.kind == .trial || upcoming.kind == .intro {
            let trial = upcoming.kind == .trial
            let title = onPayment ? L(trial ? "detail_trialStartsNext" : "detail_introStartsNext") : L(trial ? "detail_trialStartsOn" : "detail_introStartsOn", ["date": day])
            let end = Day.parse(upcoming.endsAt)
            let following = row.phases.first { $0.id != upcoming.id && end != nil && Day.parse($0.startsAt) == end }
            let line = following.flatMap { next in end.map { L("detail_offerUntil", ["promo": to, "date": Display.day($0), "price": perPeriod(next.cost, next.currency, subscription)]) } } ?? to
            return Note(symbol: "tag", tone: AppTheme.accentBright, title: title, line: line, phase: upcoming)
        }
        if row.effectiveKind == .trial {
            return Note(symbol: "hourglass", tone: AppTheme.warning, title: onPayment ? L("detail_trialEndsNext") : L("detail_trialEndsOn", ["date": day]),
                        line: L("detail_trialCancelBy", ["date": day]), cancels: row.allowedActions.contains(.cancel))
        }
        let switches = subscription.currency.lowercased() != upcoming.currency.lowercased()
        let change = switches ? rates.flatMap { Pricing.yearlyChange(subscription, to: upcoming, rates: $0, currency: currency) } : Pricing.yearlyChange(subscription, to: upcoming)
        // Nil only for a currency switch with no rate to compare by.
        let up: Bool? = switches ? change.map { $0 > 0 } : (Double(upcoming.cost) ?? 0) > (Double(subscription.cost) ?? 0)
        let title = if row.effectiveKind == .intro && upcoming.kind == .standard {
            onPayment ? L("detail_introEndsNext") : L("detail_introEndsOn", ["date": day])
        } else if onPayment { L("detail_newPriceNext") }
        else { L(up.map { $0 ? "detail_priceUpOn" : "detail_priceDownOn" } ?? "detail_priceChangesOn", ["date": day]) }
        let yearly = change.map { L($0 > 0 ? "detail_yearlyMore" : "detail_yearlyLess", ["delta": Display.money(abs($0), switches ? currency : upcoming.currency)]) }
        let billed = switches ? L("detail_billedIn", ["currency": upcoming.currency.uppercased()]) : nil
        // On the next payment the card above already shows the new amount, so only the effect is left to say.
        let line = onPayment ? sentence([billed, yearly].compactMap { $0 }.joined(separator: " · ")) : ([from + " → " + to] + [yearly].compactMap { $0 }).joined(separator: " · ")
        return Note(symbol: up.map { $0 ? "arrow.up.right" : "arrow.down.right" } ?? "arrow.left.arrow.right",
                    tone: up.map { $0 ? AppTheme.warning : AppTheme.accentBright },
                    title: title, line: line, phase: upcoming)
    }

    private func panel(_ note: Note) -> some View {
        let menu = editable && note.phase != nil
        return VStack(spacing: 12) {
            HStack(spacing: 0) {
                HStack(spacing: 12) {
                    ToneIcon(symbol: note.symbol, tone: note.tone)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(note.title).appFont(15, weight: .semibold)
                        if !note.line.isEmpty { Text(note.line).appFont(13).foregroundStyle(secondary).monospacedDigit() }
                    }.fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
                }.accessibilityElement(children: .combine)
                if menu, let phase = note.phase { manageMenu(phase) }
            }
            if note.cancels {
                Button(action: cancel) {
                    Text(L("action_cancel")).appFont(15, weight: .semibold).foregroundStyle(AppTheme.text)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(Color.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityIdentifier("cancelTrial")
            }
        }
        .padding(.leading, 14).padding(.trailing, menu ? 0 : 14).padding(.vertical, menu ? 10 : 14)
        .background(Color.black.opacity(0.45), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .accessibilityElement(children: .contain).accessibilityIdentifier(ending ? "cancellationSavings" : "pendingPriceCard")
    }

    private func manageMenu(_ phase: PricePhase) -> some View {
        Menu {
            Button { confirming = true } label: { Label(actionTitle(apply: true), systemImage: "forward.end") }
                .accessibilityIdentifier("applyPendingPrice")
            Button(role: .destructive) { confirming = false } label: { DestructiveMenuLabel(title: actionTitle(apply: false)) }
                .accessibilityIdentifier("removePendingPrice")
        } label: {
            Group {
                if running != nil { ProgressView().controlSize(.small) }
                else { Image(systemName: "ellipsis").font(.system(size: 18, weight: .semibold)).foregroundStyle(secondary) }
            }.frame(width: 44, height: 44).contentShape(Rectangle())
        }
        .tint(AppTheme.text).disabled(running != nil).accessibilityLabel(L("detail_manageChange")).accessibilityIdentifier("managePendingPrice")
        .confirmationDialog(confirming == false ? L("detail_removePendingTitle") : L(endsOffer ? "pricing_endOfferTitle" : "detail_applyNowTitle"),
                            isPresented: Binding(get: { confirming != nil }, set: { if !$0 { confirming = nil } }), titleVisibility: .visible, presenting: confirming) { apply in
            Button(actionTitle(apply: apply), role: apply ? nil : .destructive) { running = apply }
                .accessibilityIdentifier("confirmPendingPrice")
            Button(L("common_cancel"), role: .cancel) {}
        } message: { apply in Text(message(apply: apply)) }
    }

    private func actionTitle(apply: Bool) -> String { L(apply ? (endsOffer ? "native_endOffer" : "native_applyNow") : "native_removePending") }
    private func message(apply: Bool) -> String {
        guard let upcoming = row.upcoming else { return "" }
        let day = Display.date(Day.parse(upcoming.startsAt) ?? Day.today())
        if !apply { return L("detail_removePendingBody", ["price": price(subscription.cost, subscription.currency), "date": day]) }
        return endsOffer ? L("pricing_endOfferHint", ["date": day]) : L("detail_applyNowBody", ["price": price(upcoming.cost, upcoming.currency), "date": day])
    }
}

private enum BrandTint {
    // Logos sit on white or black plates, so averaging every pixel lands on grey; only saturated pixels carry the brand color.
    static func card(_ image: UIImage?) -> Color? {
        guard let source = image?.cgImage else { return nil }
        let side = 24
        var pixels = [UInt8](repeating: 0, count: side * side * 4)
        let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
            guard let context = CGContext(data: buffer.baseAddress, width: side, height: side, bitsPerComponent: 8, bytesPerRow: side * 4,
                                          space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
            context.draw(source, in: CGRect(x: 0, y: 0, width: side, height: side))
            return true
        }
        guard drawn else { return nil }
        var red = 0.0, green = 0.0, blue = 0.0, weight = 0.0
        for index in stride(from: 0, to: pixels.count, by: 4) {
            let alpha = Double(pixels[index + 3]) / 255
            guard alpha > 0.5 else { continue }
            let r = Double(pixels[index]) / 255 / alpha, g = Double(pixels[index + 1]) / 255 / alpha, b = Double(pixels[index + 2]) / 255 / alpha
            let high = max(r, g, b), saturation = high > 0 ? (high - min(r, g, b)) / high : 0
            guard saturation > 0.3, high > 0.25 else { continue }
            red += r * saturation; green += g * saturation; blue += b * saturation; weight += saturation
        }
        guard weight > 4 else { return nil }
        var base: (red: CGFloat, green: CGFloat, blue: CGFloat, alpha: CGFloat) = (0, 0, 0, 0)
        UIColor(AppTheme.surface).getRed(&base.red, green: &base.green, blue: &base.blue, alpha: &base.alpha)
        let mix = 0.06
        return Color(red: base.red * (1 - mix) + red / weight * mix, green: base.green * (1 - mix) + green / weight * mix, blue: base.blue * (1 - mix) + blue / weight * mix)
    }
}

private struct HeroBottomKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = max(value, nextValue()) }
}

private struct LogoImage: ViewModifier {
    let domain: String?
    let logos: LogoService
    var variant: String? = nil
    let update: (UIImage?) -> Void
    @State private var revision = 0
    func body(content: Content) -> some View {
        content
            .onReceive(NotificationCenter.default.publisher(for: LogoService.variantChanged)) { note in
                if note.object as? String == domain { revision += 1 }
            }
            .task(id: "\(domain ?? ""):\(variant ?? "saved"):\(revision)") {
                guard let domain else { update(nil); return }
                let variant = if let variant { variant } else { await logos.variant(for: domain) }
                if let cached = await logos.cached(domain: domain, variant: variant), let bytes = cached.bytes {
                    update(UIImage(data: bytes))
                }
                let payload = await logos.load(domain: domain, variant: variant)
                guard !Task.isCancelled else { return }
                update(payload?.bytes.flatMap(UIImage.init(data:)))
            }
    }
}

struct BrandWash: View {
    let domain: String?
    let logos: LogoService
    var variant: String? = nil
    @State private var image: UIImage?
    var body: some View {
        GeometryReader { geometry in
            if let image {
                Image(uiImage: image).resizable().scaledToFill().frame(width: geometry.size.width, height: geometry.size.height)
                    .saturation(2.6).brightness(-0.15).blur(radius: 40).scaleEffect(2.6)
            }
            LinearGradient(stops: [.init(color: AppTheme.background.opacity(0.4), location: 0), .init(color: AppTheme.background.opacity(0.72), location: 0.52), .init(color: AppTheme.background, location: 1)], startPoint: .top, endPoint: .bottom)
        }.background(AppTheme.surface).clipped().accessibilityHidden(true)
            .modifier(LogoImage(domain: domain, logos: logos, variant: variant) { image = $0 })
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
            }.scrollContentBackground(.hidden).appScreen().navigationTitle(title)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { SheetCloseButton() }
                    ToolbarItem(placement: .confirmationAction) {
                        ActionButton(title: L("native_confirm"), role: destructive ? .destructive : nil, iconOnly: true) { try await action(); dismiss() }.accessibilityIdentifier("confirmAction")
                    }
                }
        }.presentationDetents([.medium, .large]).appSheet()
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
    @State private var rates: ExchangeRates?
    private var cancellationDate: Date? {
        let zone = TimeZone(identifier: state.presentation.preferences.preferredTimezone) ?? .current
        return Recurrence.next(row.subscription, onOrAfter: Day.today(Date(), zone: zone))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    SubscriptionIdentity(subscription: row.subscription, logos: services.logos)
                    if action == .cancel {
                        AppSection(title: L("native_cancelProviderStep"), footnote: L("native_cancellationHelp")) {
                            if let link = ProviderCancellation.url(row.subscription.brandDomain) ?? row.subscription.brandDomain.flatMap({ URL(string: "https://" + $0) }) {
                                Link(destination: link) {
                                    HStack(spacing: 12) {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(L(ProviderCancellation.url(row.subscription.brandDomain) == nil ? "native_providerSite" : "native_provider"))
                                                .appFont(16, weight: .semibold).lineLimit(1).minimumScaleFactor(0.8)
                                                .multilineTextAlignment(.leading)
                                            if let host = link.host { Text(host).appFont(13).foregroundStyle(AppTheme.muted) }
                                        }.frame(maxWidth: .infinity, alignment: .leading)
                                        Image(systemName: "arrow.up.right.square").accessibilityHidden(true)
                                    }.padding(16).frame(minHeight: 52).contentShape(Rectangle())
                                }.foregroundStyle(AppTheme.accentBright).accessibilityIdentifier("providerWebsite")
                            } else {
                                Text(L("native_cancelNoWebsite")).appFont(16).padding(16)
                            }
                        }
                        AppSection(title: L("native_cancelTrackingStep")) {
                            SheetChoice(title: L("native_periodEnd"), subtitle: cancellationDate.map { Display.date($0) }, selected: !immediate) { immediate = false }
                                .accessibilityIdentifier("cancelAtRenewal")
                            AppDivider(inset: 16)
                            SheetChoice(title: L("native_immediately"), subtitle: Display.date(Day.today()), selected: immediate) { immediate = true }
                                .accessibilityIdentifier("cancelImmediately")
                        }
                        if let ending = immediate ? Day.today() : cancellationDate {
                            let currency = state.presentation.preferences.preferredCurrency
                            if let rates, case let yearly = Savings.annual(row.subscription, phases: row.phases, from: ending, rates: rates, currency: currency), yearly > 0 {
                                Text(L("native_cancelYearly", ["amount": Display.money(yearly, currency)]))
                                    .appFont(16, weight: .semibold).foregroundStyle(AppTheme.accentBright).fixedSize(horizontal: false, vertical: true)
                            }
                            Text(L("native_cancelSummary", ["date": Display.date(ending)]))
                                .appFont(14).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true)
                                .accessibilityIdentifier("cancellationSummary")
                        }
                    } else {
                        AppSection {
                            if action == .pause {
                                Toggle(L("native_resumeDate"), isOn: $timed).padding(16)
                                if timed { DatePicker(L("detail_resumes"), selection: $date, in: Day.shift(Day.today(), days: 1)..., displayedComponents: .date).environment(\.timeZone, .gmt).padding(16) }
                            }
                            if action == .restart { DatePicker(L("native_date"), selection: $date, in: ...Day.today(), displayedComponents: .date).environment(\.timeZone, .gmt).padding(16) }
                        }
                    }
                }.padding(20)
            }.appScreen().navigationTitle(L(action == .cancel ? "native_cancellationTitle" : "native_action_" + action.rawValue))
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { SheetCloseButton() }
                    ToolbarItem(placement: .confirmationAction) { ActionButton(title: L(action == .cancel ? "form_save" : "native_confirm")) {
                    let day = action == .restart || (action == .pause && timed) ? Day.floor(date) : nil
                    try await services.repository.transition(id: row.id, action: action, day: day, immediate: immediate, rates: try await services.exchange.cached(), now: Date())
                    state.reload += 1; dismiss()
                    }.accessibilityIdentifier("confirmLifecycle") }
                }
                .task { if action == .cancel { rates = try? await services.exchange.cached() } }
        }.appSheet()
    }
}

enum ProviderCancellation {
    static func url(_ domain: String?) -> URL? {
        let known = ["netflix.com": "https://www.netflix.com/cancelplan", "spotify.com": "https://www.spotify.com/account/subscription/", "youtube.com": "https://www.youtube.com/paid_memberships", "icloud.com": "https://support.apple.com/118428", "music.apple.com": "https://apps.apple.com/account/subscriptions", "adobe.com": "https://account.adobe.com/plans"]
        return domain.flatMap { known[$0] }.flatMap(URL.init(string:))
    }
}
