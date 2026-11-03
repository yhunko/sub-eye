import SwiftUI
import SubEyeCore
import UserNotifications

struct NotificationsView: View {
    @Binding var state: SceneState
    let services: AppServices
    @Binding var sheet: SheetRoute?
    @State private var permission = UNAuthorizationStatus.notDetermined
    @State private var pending = 0
    @State private var nextFire: Date?
    @State private var changes = 0
    @State private var liveChanges = 0
    @State private var liveIssue: String?
    private var time: Binding<Date> {
        Binding(get: { Calendar.current.date(from: DateComponents(hour: state.settings.reminders.hour, minute: state.settings.reminders.minute)) ?? Date() }, set: {
            state.settings.reminders.hour = Calendar.current.component(.hour, from: $0)
            state.settings.reminders.minute = Calendar.current.component(.minute, from: $0)
        })
    }
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                AppSection(title: L("notifs_renewals")) {
                    Toggle(L("notifs_renewalSwitch"), isOn: $state.settings.reminders.renewals).notificationRow()
                    if state.settings.reminders.renewals { AppDivider(inset: 16); leads(\.renewalLeadDays) }
                }
                liveActivities
                AppSection(title: L("notifs_trials"), footnote: L("notifs_trialsHint")) {
                    if state.settings.pro {
                        Toggle(L("notifs_trialSwitch"), isOn: $state.settings.reminders.trials).notificationRow()
                        if state.settings.reminders.trials { AppDivider(inset: 16); leads(\.trialLeadDays) }
                    } else {
                        Button { sheet = .paywall } label: { SettingsRow(icon: "bell.badge", title: L("notifs_trialReminders"), value: L("paywall_badge")) }.buttonStyle(.plain)
                    }
                }
                if state.presentation.installmentCount > 0 {
                    AppSection(title: L("notifs_installments"), footnote: L("notifs_installmentsHint")) {
                        Toggle(L("notifs_installmentSwitch"), isOn: $state.settings.reminders.installments).notificationRow().accessibilityIdentifier("installmentReminders")
                        if state.settings.reminders.installments { AppDivider(inset: 16); leads(\.installmentLeadDays) }
                    }
                }
                AppSection(footnote: L("notifs_timeHint", ["zone": TimeZone.current.identifier])) {
                    DatePicker(L("native_time"), selection: time, displayedComponents: .hourAndMinute).notificationRow()
                }
                AppSection {
                    SettingsRow(icon: "bell", title: L("native_pendingCount", ["count": String(pending)]), chevron: false)
                    if let nextFire {
                        AppDivider(inset: 47)
                        SettingsRow(icon: "clock", title: L("notifs_nextFire"), value: nextFire.formatted(.dateTime.month(.abbreviated).day().hour().minute()), chevron: false)
                    }
                    if pending >= ReminderPlanner.budget { Text(L("notifs_atBudget")).appFont(12.5).foregroundStyle(AppTheme.muted).padding(16) }
                    if permission == .denied {
                        Text(L("native_permissionDenied")).appFont(13).foregroundStyle(AppTheme.muted).padding(16)
                        Link(destination: URL(string: UIApplication.openSettingsURLString)!) {
                            SettingsRow(icon: "gearshape", title: L("settings_openDeviceSettings"), color: AppTheme.accentBright, chevron: false)
                        }.buttonStyle(.plain)
                    }
                    AppDivider(inset: 47)
                    ActionButton(title: L("native_testReminder"), icon: "paperplane", styledRow: true) { try await services.notifications.test(); permission = await services.notifications.permission() }.buttonStyle(.plain).accessibilityIdentifier("testReminder")
                }
            }.padding(16).padding(.bottom, 8)
        }.appScreen().navigationTitle(L("settings_notifications"))
            .onChange(of: state.settings.reminders) { _ in changes += 1 }
            .onChange(of: state.settings.liveActivities) { _ in liveChanges += 1 }
            .task { await refreshHealth() }
            .task(id: changes) {
                guard changes > 0 else { return }
                do {
                    // Saved before the permission prompt: the prompt cycles the scene, and the refresh that follows
                    // would otherwise adopt the old setting and flip the switch back.
                    try await services.repository.setSetting("notifications.settings", value: state.settings.reminders)
                    let reminders = state.settings.reminders
                    if reminders.renewals || reminders.trials || reminders.installments { _ = try await services.notifications.authorize() }
                    try await services.synchronizeSurfaces(state)
                    await refreshHealth()
                } catch is CancellationError { } catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
            }
            .task(id: liveChanges) {
                guard liveChanges > 0 else { return }
                do {
                    try await services.live.setEnabled(state.settings.liveActivities)
                    try await services.live.synchronize(model: state.presentation, rates: services.exchange.cached(), logos: services.logos); liveIssue = nil
                } catch is CancellationError { } catch { liveIssue = L("native_liveDenied") }
            }
    }
    private var liveActivities: some View {
        let support = LiveActivityService.support
        return AppSection(footnote: L("native_liveHint")) {
            Toggle(L("native_liveTitle"), isOn: support == .unavailable ? .constant(false) : $state.settings.liveActivities)
                .disabled(support == .unavailable).notificationRow().accessibilityIdentifier("liveActivitiesToggle")
            if support == .unavailable {
                Text(L("native_liveFallback")).appFont(12.5).foregroundStyle(AppTheme.muted).padding(.horizontal, 16).padding(.bottom, 12)
            } else {
                if support == .onOpen {
                    Text(L("native_liveOnOpen")).appFont(12.5).foregroundStyle(AppTheme.muted).padding(.horizontal, 16).padding(.bottom, 12)
                }
                if !services.live.authorized {
                    Text(L("native_liveDenied")).appFont(12.5).foregroundStyle(AppTheme.muted).padding(16)
                    Link(destination: URL(string: UIApplication.openSettingsURLString)!) { SettingsRow(icon: "gearshape", title: L("settings_openDeviceSettings")) }.buttonStyle(.plain)
                }
            }
            if let liveIssue { Text(liveIssue).appFont(12.5).foregroundStyle(AppTheme.muted).padding(16) }
        }
    }
    private func refreshHealth() async {
        permission = await services.notifications.permission()
        state.notificationsAllowed = permission == .authorized || permission == .provisional || permission == .ephemeral
        pending = await services.notifications.pendingCount()
        nextFire = await services.notifications.nextFireDate()
    }
    @ViewBuilder private func leads(_ path: WritableKeyPath<ReminderSettings, [Int]>) -> some View {
        if state.settings.pro {
            ForEach([0, 1, 3, 7], id: \.self) { day in
                Toggle(L([0: "notifs_leadSameDay", 1: "notifs_leadOneDay", 3: "notifs_leadThreeDays", 7: "notifs_leadOneWeek"][day]!), isOn: Binding(get: {
                    state.settings.reminders[keyPath: path].contains(day)
                }, set: { enabled in
                    var values = state.settings.reminders[keyPath: path]
                    values.removeAll { $0 == day }; if enabled { values.append(day) }; if values.isEmpty { values = [1] }
                    state.settings.reminders[keyPath: path] = values.sorted()
                })).notificationRow()
            }
        } else { Text(L("notifs_leadOneDay")).appFont(16).foregroundStyle(AppTheme.muted).notificationRow(); Button(L("notifs_leadHintFree")) { sheet = .paywall }.appFont(12.5).foregroundStyle(AppTheme.accentBright).notificationRow() }
    }
}

private extension View {
    func notificationRow() -> some View { appFont(16).padding(.horizontal, 16).padding(.vertical, 8).frame(minHeight: 44) }
}
