import SwiftUI
import SubEyeCore
import StoreKit

struct MainShell: View {
    @Binding var state: SceneState
    let services: AppServices
    @ObservedObject var inbox: NotificationInbox
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.requestReview) private var requestReview
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var tab = AppTab.home
    @State private var paths: [AppTab: [Route]] = [:]
    @State private var sheet: SheetRoute?
    @State private var firstFrame = false
    @State private var booted = false
    @State private var retry = 0
    @State private var externalTick = 0
    @State private var pendingURL: URL?
    @State private var cloudNotification: Notification?
    @State private var cloudTick = 0
    var body: some View {
        tabs
            .environment(\.symbolVariants, .none)
            .background(FirstFrame { firstFrame = true }.frame(width: 0, height: 0))
            .overlay(alignment: .top) { if !state.ready { ProgressView().padding(6).accessibilityLabel(L("native_loading")) } }
            .sheet(item: $sheet) { destinationSheet($0) }
            .alert(item: $state.notice) { notice in
                if !state.ready { return Alert(title: Text(notice.title), message: Text(notice.message), primaryButton: .default(Text(L("common_retry"))) { retry += 1 }, secondaryButton: .cancel(Text(L("common_cancel")))) }
                return Alert(title: Text(notice.title), message: Text(notice.message), dismissButton: .default(Text(L("common_done"))))
            }
            .onOpenURL { route($0) }
            .onReceive(inbox.$url) { if let url = $0 { route(url); inbox.url = nil } }
            .onReceive(NotificationCenter.default.publisher(for: NSUbiquitousKeyValueStore.didChangeExternallyNotification)) { cloudNotification = $0; cloudTick += 1 }
            .task(id: "\(firstFrame):\(retry)") {
                guard firstFrame, !booted else { return }
                do {
                    adopt(try await services.load()); booted = true; externalTick += 1
                    if let url = pendingURL { route(url); pendingURL = nil }
                } catch { state.notice = Notice(title: L("common_loadFailed"), message: L("native_storeError")) }
            }
            .task(id: state.reload) {
                guard booted else { return }
                do {
                    adopt(try await services.refresh())
                    try await services.synchronizeSurfaces(state)
                    try await services.cloud.push()
                } catch is CancellationError { } catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
            }
            .task(id: "\(scenePhase):\(externalTick)") {
                guard booted, scenePhase == .active else { return }
                do {
                    let issue = await services.externalUpdates()
                    try Task.checkCancellation()
                    adopt(try await services.refresh()); state.serviceIssue = issue ? L("native_serviceIssue") : nil
                    try await services.synchronizeSurfaces(state)
                } catch is CancellationError { } catch { state.serviceIssue = L("native_serviceIssue") }
            }
            .task(id: cloudTick) {
                guard booted, let notification = cloudNotification else { return }
                do { if try await services.cloud.receive(notification) { state.reload += 1 } }
                catch { state.serviceIssue = L("settings_syncUnavailableHint") }
            }
            .task(id: "\(state.ready):\(tab):\(sheet?.id ?? ""):\(state.presentation.totalCount):\(state.settings.pro):\(state.remindersOfferPending):\(scenePhase)") {
                guard booted, sheet == nil, scenePhase == .active else { return }
                do {
                    if state.remindersOfferPending {
                        try await Task.sleep(for: .milliseconds(400))
                        state.remindersOfferPending = false; sheet = .prompt(.reminders)
                    } else if tab == .home {
                        try await Task.sleep(for: .milliseconds(1500))
                        if let prompt = try await services.prompts.home(tracked: state.presentation.totalCount, settings: state.settings, now: Date()) {
                            if prompt == .review { requestReview() } else { sheet = .prompt(prompt) }
                        }
                    }
                } catch { }
            }
    }
    @ViewBuilder private var tabs: some View {
        if #available(iOS 18, *) {
            TabView(selection: $tab) {
                Tab(value: AppTab.home) { stack(.home) } label: { tabLabel("tabs_home", icon: "house") }
                Tab(value: AppTab.subscriptions) { stack(.subscriptions) } label: { tabLabel("tabs_subscriptions", icon: "rectangle.stack") }
                Tab(value: AppTab.calendar) { stack(.calendar) } label: { tabLabel("tabs_calendar", icon: "calendar") }
                Tab(value: AppTab.settings) { stack(.settings) } label: { tabLabel("tabs_settings", icon: "gearshape") }
            }
        } else {
            TabView(selection: $tab) {
                stack(.home).tabItem { tabLabel("tabs_home", icon: "house") }.tag(AppTab.home)
                stack(.subscriptions).tabItem { tabLabel("tabs_subscriptions", icon: "rectangle.stack") }.tag(AppTab.subscriptions)
                stack(.calendar).tabItem { tabLabel("tabs_calendar", icon: "calendar") }.tag(AppTab.calendar)
                stack(.settings).tabItem { tabLabel("tabs_settings", icon: "gearshape") }.tag(AppTab.settings)
            }
        }
    }
    private func tabLabel(_ key: String, icon: String) -> some View {
        Label(L(key), systemImage: icon).environment(\.symbolVariants, .none)
    }
    private func stack(_ tab: AppTab) -> some View {
        NavigationStack(path: Binding(get: { paths[tab] ?? [] }, set: { paths[tab] = $0 })) {
            Group {
                switch tab {
                case .home: HomeView(state: $state, services: services, sheet: $sheet) { self.tab = .calendar; paths[.calendar] = [] }
                case .subscriptions: SubscriptionsView(state: $state, services: services, sheet: $sheet)
                case .calendar: RenewalCalendarView(state: $state, services: services, sheet: $sheet)
                case .settings: SettingsView(state: $state, services: services, sheet: $sheet)
                }
            }
            .navigationDestination(for: Route.self) { destination($0) }
            // The surviving stack owns visibility so the bar animates during a pop, not after the picker disappears.
            .toolbar(paths[tab]?.contains(.currency) == true ? .hidden : .visible, for: .tabBar)
            .animation(reduceMotion ? nil : .easeInOut(duration: 0.3), value: paths[tab]?.contains(.currency) == true)
        }
    }
    @ViewBuilder private func destination(_ route: Route) -> some View {
        switch route {
        case .subscription(let id): SubscriptionDetail(id: id, state: $state, services: services, sheet: $sheet)
        case .due(let date): DueView(day: date, ids: nil, state: $state, services: services, sheet: $sheet)
        case .cancellationDay(let date): DueView(day: date, ids: nil, state: $state, services: services, sheet: $sheet, planning: true)
        case .selection(let ids): DueView(day: nil, ids: ids, state: $state, services: services, sheet: $sheet)
        case .categories: CategoriesView(state: $state, services: services, sheet: $sheet)
        case .currency:
            CurrencyPicker(selection: $state.presentation.preferences.preferredCurrency) { currency in
                var preferences = state.presentation.preferences; preferences.preferredCurrency = currency
                try await services.repository.savePreferences(preferences); state.reload += 1
            }
        case .notifications: NotificationsView(state: $state, services: services, sheet: $sheet)
        case .year(let year): YearView(year: year, state: $state, services: services)
        case .legal(let kind): LegalView(kind: kind)
        }
    }
    @ViewBuilder private func destinationSheet(_ sheet: SheetRoute) -> some View {
        switch sheet {
        case .editor(let original): SubscriptionEditor(original: original, state: $state, services: services)
        case .paywall: PaywallView(state: $state, services: services)
        case .pricing(let row): PricingView(row: row, state: $state, services: services)
        case .lifecycle(let row, let action): LifecycleView(row: row, action: action, state: $state, services: services)
        case .category(let original): CategoryEditor(original: original, state: $state, services: services)
        case .cancellation(let id):
            if let row = state.presentation.rows.first(where: { $0.id == id }) { LifecycleView(row: row, action: .cancel, state: $state, services: services) }
        case .prompt(let prompt): PromptView(prompt: prompt, state: $state, services: services)
        }
    }
    private func adopt(_ next: SceneState) {
        guard next.presentation.revision >= state.presentation.revision else { return }
        state.presentation = next.presentation; state.settings = next.settings; state.ready = true
    }
    private func route(_ url: URL) {
        guard booted else { pendingURL = url; return }
        guard let (newTab, route, newSheet) = DeepLink.route(url) else { return }
        if let newTab { tab = newTab }
        if let route { paths[tab] = [route] }
        if let newSheet { sheet = newSheet }
    }
}

private struct PromptView: View {
    let prompt: UserPrompt
    @Binding var state: SceneState
    let services: AppServices
    @Environment(\.dismiss) private var dismiss
    @State private var paywall = false
    var body: some View {
        NavigationStack {
            Form {
                Text(L(prompt == .reminders ? "prompt_remindersBody" : "prompt_proBody"))
            }.scrollContentBackground(.hidden).appScreen().navigationTitle(L(prompt == .reminders ? "prompt_remindersTitle" : "prompt_proTitle"))
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { SheetCloseButton() }
                    ToolbarItem(placement: .confirmationAction) {
                        if prompt == .reminders {
                            ActionButton(title: L("prompt_remindersConfirm"), iconOnly: true) {
                                if try await services.notifications.authorize() {
                                    state.settings.reminders.renewals = true
                                    try await services.repository.setSetting("notifications.settings", value: state.settings.reminders)
                                    state.reload += 1
                                }
                                dismiss()
                            }
                        } else { Button { paywall = true } label: { Label(L("prompt_proConfirm"), systemImage: "checkmark") }.labelStyle(.iconOnly) }
                    }
                }
        }.presentationDetents([.medium, .large]).appSheet()
            .sheet(isPresented: $paywall, onDismiss: { dismiss() }) { PaywallView(state: $state, services: services) }
    }
}

private struct DueView: View {
    let day: String?
    let ids: [String]?
    @Binding var state: SceneState
    let services: AppServices
    @Binding var sheet: SheetRoute?
    var planning = false
    @State private var events: [CalendarEvent] = []
    var body: some View {
        List {
            if planning { Text(L("native_chooseCancellation")) }
            if let ids {
                ForEach(state.presentation.rows.filter { ids.contains($0.id) }) { row in
                    NavigationLink(value: Route.subscription(row.id)) { SubscriptionCell(row: row, currency: state.presentation.preferences.preferredCurrency, logos: services.logos) }
                }
            } else {
                ForEach(events) { event in
                    if planning {
                        Button { sheet = .cancellation(event.subscriptionId) } label: { EventCell(event: event, currency: state.presentation.preferences.preferredCurrency, logos: services.logos) }
                    } else {
                        NavigationLink(value: Route.subscription(event.subscriptionId)) { EventCell(event: event, currency: state.presentation.preferences.preferredCurrency, logos: services.logos) }
                            .accessibilityIdentifier("due-" + event.subscriptionId)
                            .swipeActions { Button(L("native_action_cancel")) { sheet = .cancellation(event.subscriptionId) } }
                    }
                }
                if events.isEmpty { Text(L("native_noRenewals")).foregroundStyle(.secondary) }
            }
        }.navigationTitle(day.flatMap(Day.parse).map { Display.date($0) } ?? L("tabs_subscriptions"))
            .task(id: state.presentation.revision) {
                guard let day = day.flatMap(Day.parse) else { return }
                do {
                    let result = try await services.repository.calendar(from: day, through: day, rates: services.exchange.cached(), now: Date())
                    events = planning ? result.filter { event in event.kind == .payment && state.presentation.rows.first(where: { $0.id == event.subscriptionId })?.allowedActions.contains(.cancel) == true } : result
                }
                catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
            }
    }
}
