import SwiftUI
import SubEyeCore

struct InstallmentDetail: View {
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
    @State private var undo: UUID?
    @State private var enabling: UUID?
    @State private var heroBottom: CGFloat = 300
    private var row: InstallmentRow? { state.presentation.installments?.first { $0.id == id } }
    var body: some View {
        Group {
            if let row {
                let plan = row.plan
                // The day the presentation's rows were projected for, so the schedule and the progress card agree on what is paid.
                let today = Day.today(state.presentation.generatedAt, zone: TimeZone(identifier: state.presentation.preferences.preferredTimezone) ?? .current)
                GeometryReader { geometry in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 14) {
                            hero(plan).padding(.horizontal, -16)
                                .background { GeometryReader { heroGeometry in Color.clear.preference(key: HeroBottomKey.self, value: heroGeometry.frame(in: .named("installmentDetail")).maxY) } }
                            progress(row)
                            details(row, today: today)
                            if state.settings.pro {
                                if let overpayment = row.overpayment { overpaymentRow(plan, amount: overpayment) }
                            } else {
                                ProTeaser(title: L("installment_lockOverpayment"), message: L("installment_lockOverpaymentBody")) { sheet = .paywall }
                                    .accessibilityIdentifier("overpaymentLock")
                            }
                            if !row.finished, state.notificationsAllowed != nil { reminder }
                            InstallmentSchedule(plan: plan, today: today).equatable()
                            if let notes = plan.notes, !notes.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    DetailCaption(title: L("native_notes"))
                                    Text(notes).appFont(15).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading).padding(16).appCard()
                                }.padding(.top, 8)
                            }
                        }.padding(.horizontal, 16).padding(.bottom, 24)
                    }.coordinateSpace(name: "installmentDetail")
                        .onPreferenceChange(HeroBottomKey.self) { heroBottom = $0 }
                        .background(alignment: .top) {
                            if let domain = plan.lenderDomain { DetailWash(domain: domain, logos: services.logos, height: heroBottom, insets: geometry.safeAreaInsets) }
                        }
                        .appScreen().navigationTitle(typeSize.isAccessibilitySize ? L("installment_detailTitle") : "")
                        .toolbarBackground(.hidden, for: .navigationBar)
                        .toolbar { ToolbarItem(placement: .topBarTrailing) { actions(row) } }
                }
            } else { Text(L("common_loadFailed")) }
        }
        .task(id: enabling) {
            guard enabling != nil else { return }
            defer { enabling = nil }
            if await services.notifications.permission() == .denied { openURL(URL(string: UIApplication.openSettingsURLString)!); return }
            var reminders = state.settings.reminders
            reminders.installments = true
            do {
                try await services.repository.setSetting("notifications.settings", value: reminders)
                _ = try await services.notifications.authorize()
                let allowed = await services.notifications.allowed()
                withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.25)) { state.settings.reminders = reminders; state.notificationsAllowed = allowed }
                state.reload += 1
            } catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
        }
        .task(id: undo) {
            guard undo != nil, let plan = row?.plan else { return }
            defer { undo = nil }
            var value = plan; value.paidOffAt = nil; value.payoffAmount = nil
            do { try await services.repository.saveInstallment(value, expected: plan, now: Date()); state.reload += 1 }
            catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
        }
        .alert(L("installment_deleteTitle"), isPresented: $delete) {
            Button(L("native_delete"), role: .destructive) { deletion = UUID() }.accessibilityIdentifier("confirmAction")
            Button(L("common_cancel"), role: .cancel) {}.accessibilityIdentifier("cancelDeletion")
        } message: { Text(L("installment_deleteBody")) }
        .task(id: deletion) {
            guard deletion != nil else { return }
            do { try await services.repository.deleteInstallment(id: id); state.reload += 1; dismiss() }
            catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)); deletion = nil }
        }
    }
    private func money(_ value: Double, _ plan: InstallmentPlan) -> String { Display.money(value, plan.currency) }
    private func hero(_ plan: InstallmentPlan) -> some View {
        let subtitle = [plan.installmentKind.map { L("installment_kind_" + $0.rawValue) }, plan.lenderName].compactMap { $0 }.joined(separator: " · ")
        return VStack(spacing: 0) {
            InstallmentIcon(symbol: plan.symbol, tint: plan.tint, lenderName: plan.lenderName, lenderDomain: plan.lenderDomain, logos: services.logos, size: 80)
            Text(plan.name).appFont(24, weight: .bold, relativeTo: .title).tracking(-0.4).multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true).padding(.top, 14).accessibilityIdentifier("installmentDetailName")
            if !subtitle.isEmpty {
                Text(subtitle).appFont(15).foregroundStyle(AppTheme.muted).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true).padding(.top, 4)
            }
        }.padding(.horizontal, 24).padding(.top, 4).padding(.bottom, 12).frame(maxWidth: .infinity)
    }
    private func progress(_ row: InstallmentRow) -> some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12)) : AnyLayout(HStackLayout(alignment: .top, spacing: 16))
        return VStack(alignment: .leading, spacing: 0) {
            Text(row.finished ? L("installment_paidOff") : L("installment_progress", ["paid": String(row.paidCount), "count": String(row.count)]))
                .appFont(15, weight: .semibold).fixedSize(horizontal: false, vertical: true).accessibilityIdentifier("installmentProgress")
            SpendTrack(progress: row.finished ? 1 : Double(row.paidCount) / Double(max(1, row.count)), height: 6, color: InstallmentStyle.color(row.plan.tint)).padding(.top, 12)
            layout {
                figure(L("installment_paid"), money(row.paid, row.plan))
                figure(L("installment_left"), money(row.left, row.plan))
            }.padding(.top, 14)
        }.padding(18).frame(maxWidth: .infinity, alignment: .leading).appCard()
    }
    private func figure(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).appFont(13, relativeTo: .caption).foregroundStyle(AppTheme.muted)
            Text(value).appFont(19, weight: .bold).monospacedDigit().lineLimit(1).minimumScaleFactor(0.7)
        }.frame(maxWidth: .infinity, alignment: .leading).accessibilityElement(children: .combine)
    }
    private func details(_ row: InstallmentRow, today: Date) -> some View {
        AppSection {
            if let date = row.nextDate, let amount = row.nextAmount {
                DetailRow(title: L("detail_nextPayment"), value: money(amount, row.plan) + " · " + Display.when(date, today: today))
                if row.endDate != nil { AppDivider(inset: 18) }
            }
            if let end = row.endDate {
                DetailRow(title: L(row.finished ? "installment_paidOff" : "installment_ends"), value: Display.date(end))
            }
        }
    }
    private func overpaymentRow(_ plan: InstallmentPlan, amount: Double) -> some View {
        let price = plan.price.flatMap { Money.parse($0, below: Installments.ceiling) }.map { NSDecimalNumber(decimal: $0).doubleValue } ?? 0
        let share = price > 0 ? " · " + (amount / price).formatted(.percent.precision(.fractionLength(0...1))) : ""
        return AppSection { DetailRow(title: L("installment_overpaymentTitle"), value: money(amount, plan) + share) }
    }
    @ViewBuilder private var reminder: some View {
        let reminders = state.settings.reminders
        AppSection {
            if reminders.installments && state.notificationsAllowed == true {
                SettingsRow(icon: "bell", title: L("detail_reminderOn", ["lead": reminderLead(reminders.installmentLeadDays, pro: state.settings.pro)]), chevron: false)
                    .accessibilityIdentifier("installmentReminderOn")
            } else {
                Button { if enabling == nil { enabling = UUID() } } label: {
                    SettingsRow(icon: "bell", title: L("installment_remind"), color: AppTheme.accentBright, chevron: false)
                        .overlay(alignment: .trailing) { if enabling != nil { ProgressView().controlSize(.small).padding(.trailing, 16) } }
                }.buttonStyle(.plain).disabled(enabling != nil).accessibilityIdentifier("remindInstallment")
            }
        }
    }
    private func actions(_ row: InstallmentRow) -> some View {
        Menu {
            Button { sheet = .installmentEditor(row.plan) } label: { Label(L("native_action_edit"), systemImage: "pencil") }.accessibilityIdentifier("editInstallment")
            if row.plan.paidOffAt != nil {
                Button { undo = UUID() } label: { Label(L("installment_undoPayoff"), systemImage: "arrow.uturn.backward") }.accessibilityIdentifier("undoInstallmentPayoff")
            } else if !row.finished {
                Button { sheet = .installmentPayoff(id) } label: { Label(L("installment_payOff"), systemImage: "checkmark.seal") }.accessibilityIdentifier("payOffInstallment")
            }
            Section {
                Button(role: .destructive) { delete = true } label: { DestructiveMenuLabel(title: L("native_delete")) }.accessibilityIdentifier("deleteInstallment")
            }
        } label: { Label(L("detail_moreActions"), systemImage: "ellipsis") }.tint(AppTheme.text).disabled(deletion != nil || undo != nil).accessibilityIdentifier("installmentActions")
    }
}

// Equatable so the hero's scroll-driven updates do not rebuild a schedule of up to 360 payments on every frame.
private struct InstallmentSchedule: View, Equatable {
    let plan: InstallmentPlan
    let today: Date
    @Environment(\.dynamicTypeSize) private var typeSize
    nonisolated static func == (left: Self, right: Self) -> Bool { left.plan == right.plan && left.today == right.today }
    var body: some View {
        var entries = Installments.payments(plan, today: today).map { (id: String($0.number), title: L("installment_paymentNumber", ["number": String($0.number)]), date: $0.date, amount: $0.amount, paid: $0.paid) }
        if let payoff = Installments.payoff(plan) {
            entries.append((id: "payoff", title: L("installment_payOff"), date: payoff.date, amount: payoff.amount, paid: payoff.date <= Day.floor(today)))
        }
        return VStack(alignment: .leading, spacing: 8) {
            DetailCaption(title: L("installment_schedule"))
            LazyVStack(spacing: 0) {
                ForEach(Array(entries.enumerated()), id: \.element.id) { index, entry in
                    if index > 0 { AppDivider(inset: 32) }
                    let amount = Text(Display.money(NSDecimalNumber(decimal: entry.amount).doubleValue, plan.currency)).appFont(15, weight: .semibold).monospacedDigit()
                        .foregroundStyle(entry.paid ? AppTheme.muted : AppTheme.text)
                    HStack(spacing: 12) {
                        Image(systemName: entry.paid ? "checkmark.circle.fill" : "circle").appFont(18)
                            .foregroundStyle(entry.paid ? InstallmentStyle.color(plan.tint) : AppTheme.muted).frame(width: 20).accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(entry.title).appFont(15, weight: .semibold)
                            Text(Display.date(entry.date)).appFont(13).foregroundStyle(AppTheme.muted)
                            if typeSize.isAccessibilitySize { amount }
                        }.fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
                        if !typeSize.isAccessibilitySize { amount }
                    }.padding(.vertical, 10).frame(minHeight: 56).accessibilityElement(children: .combine)
                        .accessibilityValue(entry.paid ? L("installment_paid") : "")
                }
            }.padding(.horizontal, 18).appCard()
        }.padding(.top, 8)
    }
}

struct InstallmentPayoff: View {
    let plan: InstallmentPlan
    @Binding var state: SceneState
    let services: AppServices
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var date: Date
    @State private var amount: String
    @State private var typed = false
    private let today: Date

    init(plan: InstallmentPlan, state: Binding<SceneState>, services: AppServices) {
        self.plan = plan; _state = state; self.services = services
        // The day in the preferred time zone, as the schedule counts it; `Day.today()` would use the device's.
        today = Day.today(Date(), zone: TimeZone(identifier: state.wrappedValue.presentation.preferences.preferredTimezone) ?? .current)
        _date = State(initialValue: today)
        _amount = State(initialValue: Money.canonical(Installments.remaining(plan, on: today)))
    }

    static func value(_ plan: InstallmentPlan, date: Date, amount: String) throws -> InstallmentPlan {
        guard let parsed = Money.parse(amount, below: Installments.ceiling) else { throw DomainError.invalidField(L("installment_payoffAmount")) }
        var value = plan
        value.paidOffAt = Day.iso(Day.floor(date)); value.payoffAmount = Money.canonical(parsed)
        return value
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                AppSection(footnote: L("installment_payoffHint")) {
                    DatePicker(L("installment_payoffDate"), selection: $date, in: ...today, displayedComponents: .date).environment(\.timeZone, .gmt)
                        .appFont(16).padding(.horizontal, 16).frame(minHeight: 56).accessibilityIdentifier("installmentPayoffDate")
                    AppDivider(inset: 16)
                    FormField(title: L("installment_payoffAmount")) {
                        HStack(spacing: 6) {
                            TextField("0", text: Binding(get: { amount }, set: { amount = $0; typed = true })).keyboardType(.decimalPad)
                                .multilineTextAlignment(typeSize.isAccessibilitySize ? .leading : .trailing).accessibilityLabel(L("installment_payoffAmount"))
                                .accessibilityIdentifier("installmentPayoffAmount")
                            Text(plan.currency.uppercased()).foregroundStyle(AppTheme.muted).fixedSize()
                        }
                    }
                }.padding(20)
            }.scrollDismissesKeyboard(.interactively).appScreen().navigationTitle(L("installment_payOff"))
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { SheetCloseButton() }
                    ToolbarItem(placement: .confirmationAction) {
                        ActionButton(title: L("native_confirm"), iconOnly: true) {
                            let value = try Self.value(plan, date: date, amount: amount)
                            try await services.repository.saveInstallment(value, expected: plan, now: Date())
                            state.reload += 1
                            dismiss()
                        }.disabled(Money.parse(amount, below: Installments.ceiling) == nil).accessibilityIdentifier("confirmInstallmentPayoff")
                    }
                }
                .onChange(of: date) { day in if !typed { amount = Money.canonical(Installments.remaining(plan, on: day)) } }
        }.presentationDetents([.medium, .large]).appSheet()
    }
}
