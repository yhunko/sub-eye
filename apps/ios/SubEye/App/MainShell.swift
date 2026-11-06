import SwiftUI
import SubEyeCore
import StoreKit
import UserNotifications

struct MainShell: View {
    @Binding var state: SceneState
    let services: AppServices
    @ObservedObject var inbox: NotificationInbox
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.requestReview) private var requestReview
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.horizontalSizeClass) private var sizeClass
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
    @State private var updateAlert: StoreRelease?
    @State private var storePage = 0
    @State private var resizing: (tab: AppTab, path: [Route])?
    var body: some View {
        tabs
            .alert(L("update_available", ["version": updateAlert?.version ?? ""]), isPresented: Binding(get: { updateAlert != nil }, set: { if !$0 { updateAlert = nil } }), presenting: updateAlert) { _ in
                Button(L("update_action")) { storePage += 1 }
                Button(L("prompt_notNow"), role: .cancel) { }
            } message: { Text($0.notes ?? L("update_notes")) }
            .appStoreProductPage(storePage)
            .environment(\.symbolVariants, .none)
            .background(FirstFrame { firstFrame = true }.frame(width: 0, height: 0))
            .overlay(alignment: .top) { if !state.ready { ProgressView().padding(6).accessibilityLabel(L("native_loading")) } }
            .sheet(item: $sheet) { destinationSheet($0).environment(\.dynamicTypeSize, typeSize) }
            .alert(item: $state.notice) { notice in
                if !state.ready { return Alert(title: Text(notice.title), message: Text(notice.message), primaryButton: .default(Text(L("common_retry"))) { retry += 1 }, secondaryButton: .cancel(Text(L("common_cancel")))) }
                return Alert(title: Text(notice.title), message: Text(notice.message), dismissButton: .default(Text(L("common_done"))))
            }
            .onOpenURL { route($0) }
            .onChange(of: sizeClass) { _ in
                resizing = (tab, paths[tab] ?? [])
                Task { try? await Task.sleep(for: .seconds(1)); resizing = nil }
            }
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
            .task(id: "\(scenePhase):\(booted)") {
                guard booted, scenePhase == .active else { return }
                state.notificationsAllowed = await services.notifications.allowed()
            }
            .task(id: "\(scenePhase):\(externalTick)") {
                guard booted, scenePhase == .active else { return }
                do { state.update = try await services.updates.current(now: Date()) } catch { }
            }
            .onChange(of: state.update) { update in
                guard let update, update.alert, sheet == nil, !services.prompts.interrupted else { return }
                services.prompts.interrupted = true
                state.update?.alert = false
                updateAlert = update.release
                Task { try? await services.updates.alerted(update.release.version) }
            }
            .task(id: cloudTick) {
                guard booted, let notification = cloudNotification else { return }
                do { if try await services.cloud.receive(notification) { state.reload += 1 } }
                catch { state.serviceIssue = L("settings_syncUnavailableHint") }
            }
            .task(id: "\(state.ready):\(tab):\(sheet?.id ?? ""):\(state.presentation.totalCount + state.presentation.installmentCount):\((state.presentation.dashboard.savings?.total ?? 0) > 0):\(state.settings.pro):\(scenePhase)") {
                guard booted, sheet == nil, scenePhase == .active else { return }
                do {
                    if tab == .home {
                        try await Task.sleep(for: .milliseconds(1500))
                        let permission = await services.notifications.permission()
                        if let prompt = try await services.prompts.home(state.presentation, settings: state.settings, now: Date(),
                            permissionAllowsNotifications: permission == .authorized || permission == .provisional || permission == .ephemeral) {
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
                Tab(value: AppTab.settings) { stack(.settings) } label: { settingsLabel }.badge(settingsBadge)
            }
        } else {
            TabView(selection: $tab) {
                stack(.home).tabItem { tabLabel("tabs_home", icon: "house") }.tag(AppTab.home)
                stack(.subscriptions).tabItem { tabLabel("tabs_subscriptions", icon: "rectangle.stack") }.tag(AppTab.subscriptions)
                stack(.calendar).tabItem { tabLabel("tabs_calendar", icon: "calendar") }.tag(AppTab.calendar)
                stack(.settings).tabItem { tabLabel("tabs_settings", icon: "gearshape") }.tag(AppTab.settings).badge(settingsBadge)
            }
        }
    }
    // An empty badge is UIKit's dot; any text would read as a count. iOS 26 draws it as a full 18 pt disc over the icon,
    // so there the gear carries its own small dot instead.
    private var settingsBadge: Text? {
        if #available(iOS 26, *) { return nil }
        return state.update?.banner == true ? Text("") : nil
    }
    @ViewBuilder private var settingsLabel: some View {
        if #available(iOS 26, *), state.update?.banner == true {
            Label { Text(L("tabs_settings")) } icon: { Image(uiImage: Self.gearWithDot) }
        } else { tabLabel("tabs_settings", icon: "gearshape") }
    }
    // The gear in the symbol configuration the iOS 26 tab bar gives its icons, with a dot cut into its corner the way
    // SF Symbols' badge variants are drawn; as a template it takes the same tint as the other tabs.
    private static let gearWithDot: UIImage = {
        let gear = UIImage(systemName: "gearshape", withConfiguration: UIImage.SymbolConfiguration(pointSize: 18, weight: .medium, scale: .large))!
        let dot: CGFloat = 8, gap: CGFloat = 2
        return UIGraphicsImageRenderer(size: gear.size).image { context in
            gear.withTintColor(.black).draw(at: .zero)
            let ring = CGRect(x: gear.size.width - dot - gap, y: -gap, width: dot + gap * 2, height: dot + gap * 2)
            context.cgContext.setBlendMode(.clear)
            context.cgContext.fillEllipse(in: ring)
            context.cgContext.setBlendMode(.normal)
            context.cgContext.fillEllipse(in: ring.insetBy(dx: gap, dy: gap))
        }.withRenderingMode(.alwaysTemplate)
    }()
    private func tabLabel(_ key: String, icon: String) -> some View {
        Label(L(key), systemImage: icon).environment(\.symbolVariants, .none)
    }
    // The open iPhone Duo is regular width: the tab's screen leads and what it opens fills the trailing column. Both columns
    // read the same path as the folded stack, so folding and unfolding keep the place.
    @ViewBuilder private func stack(_ tab: AppTab) -> some View {
        if #available(iOS 17, *), sizeClass == .regular {
            // Home's trailing column is a screen that routes push onto; the others only say what to pick, so the first route
            // replaces that and has no back button to it.
            let picked = tab == .home ? 0 : 1
            NavigationSplitView {
                root(tab, sections: .summary)
                    .environment(\.openRoute, OpenRouteAction(tab: tab) { paths[tab] = [$0] })
                    .toolbar(removing: .sidebarToggle)
                    .navigationSplitViewColumnWidth(min: 320, ideal: 420, max: 480)
            } detail: {
                NavigationStack(path: Binding(get: { Array((paths[tab] ?? []).dropFirst(picked)) }, set: { setPath(tab, Array((paths[tab] ?? []).prefix(picked)) + $0) })) {
                    Group {
                        if picked > 0, let route = paths[tab]?.first { destination(route) } else { unselected(tab) }
                    }
                    .id(paths[tab]?.prefix(picked).first)
                    .navigationDestination(for: Route.self) { destination($0) }
                }
                .environment(\.besideList, true)
            }.navigationSplitViewStyle(.balanced)
        } else {
            NavigationStack(path: Binding(get: { paths[tab] ?? [] }, set: { setPath(tab, $0) })) {
                root(tab, sections: .all)
                    .navigationDestination(for: Route.self) { destination($0) }
                    // The surviving stack owns visibility so the bar animates during a pop, not after the picker disappears.
                    .toolbar(paths[tab]?.contains(.currency) == true ? .hidden : .visible, for: .tabBar)
                    .animation(reduceMotion ? nil : .easeInOut(duration: 0.3), value: paths[tab]?.contains(.currency) == true)
            }
        }
    }
    // A stack built while the window changes size class, as on folding or unfolding, reports an empty path before it has
    // pushed the one it was given; that path is pushed again once the swap settles.
    private func setPath(_ tab: AppTab, _ path: [Route]) {
        if path.isEmpty, let resizing, resizing.tab == tab, !resizing.path.isEmpty {
            self.resizing = nil
            paths[tab] = []
            DispatchQueue.main.async {
                var transaction = Transaction(); transaction.disablesAnimations = true
                withTransaction(transaction) { paths[tab] = resizing.path }
            }
        } else { paths[tab] = path }
    }
    @ViewBuilder private func root(_ tab: AppTab, sections: HomeSections) -> some View {
        switch tab {
        case .home:
            HomeView(state: $state, services: services, sheet: $sheet, openCalendar: { self.tab = .calendar; paths[.calendar] = [] },
                     openInstallments: { self.tab = .subscriptions; state.listSegment = .installments; paths[.subscriptions] = [] }, sections: sections)
        case .subscriptions:
            SubscriptionsView(state: $state, services: services, sheet: $sheet, selected: openSubscription, selectedInstallment: openInstallment,
                              openSegment: { state.listSegment = $0; paths[.subscriptions] = [] })
        case .calendar: RenewalCalendarView(state: $state, services: services, sheet: $sheet)
        case .settings: SettingsView(state: $state, services: services, sheet: $sheet)
        }
    }
    private var openSubscription: String? {
        if case .subscription(let id) = paths[.subscriptions]?.first { return id }
        return nil
    }
    private var openInstallment: String? {
        if case .installment(let id) = paths[.subscriptions]?.first { return id }
        return nil
    }
    @available(iOS 17, *)
    @ViewBuilder private func unselected(_ tab: AppTab) -> some View {
        switch tab {
        case .home where state.presentation.totalCount > 0: root(.home, sections: .breakdown)
        case .subscriptions where state.effectiveSegment == .installments: ContentUnavailableView(L("native_pickInstallment"), systemImage: "creditcard").appScreen()
        case .subscriptions where state.presentation.totalCount > 0: ContentUnavailableView(L("native_pickSubscription"), systemImage: "rectangle.stack").appScreen()
        case .calendar: ContentUnavailableView(L("native_pickDay"), systemImage: "calendar").appScreen()
        case .settings: ContentUnavailableView(L("native_pickSetting"), systemImage: "gearshape").appScreen()
        case .home, .subscriptions: Color.clear.appScreen()
        }
    }
    @ViewBuilder private func destination(_ route: Route) -> some View {
        switch route {
        case .subscription(let id): SubscriptionDetail(id: id, state: $state, services: services, sheet: $sheet)
        case .installment(let id): InstallmentDetail(id: id, state: $state, services: services, sheet: $sheet)
        case .due(let date): DueView(day: date, ids: nil, state: $state, services: services, sheet: $sheet)
        case .cancellationDay(let date): DueView(day: date, ids: nil, state: $state, services: services, sheet: $sheet, planning: true)
        case .selection(let ids): DueView(day: nil, ids: ids, state: $state, services: services, sheet: $sheet)
        case .saved: SavedSubscriptionsView(state: $state, services: services)
        case .categories: CategoriesView(state: $state, services: services, sheet: $sheet)
        case .currency:
            CurrencyPicker(selection: $state.presentation.preferences.preferredCurrency) { currency in
                var preferences = state.presentation.preferences; preferences.preferredCurrency = currency
                try await services.repository.savePreferences(preferences); state.reload += 1
            }
        case .notifications: NotificationsView(state: $state, services: services, sheet: $sheet)
        case .year(let year): YearView(year: year, state: $state, services: services)
        case .legal(let kind): LegalView(kind: kind)
        #if NATIVE_DEVELOPMENT
        case .developer: DeveloperView(state: $state, services: services, sheet: $sheet)
        case .developerScenario(let scenario):
            DeveloperScenarioScreen(scenario: scenario, state: $state, services: services, sheet: $sheet) {
                tab = .home; paths[.home] = []; paths[.settings] = [.developer]
            }
        #endif
        }
    }
    @ViewBuilder private func destinationSheet(_ sheet: SheetRoute) -> some View {
        switch sheet {
        case .editor(let original, let flow):
            SubscriptionEditor(original: original, flow: flow, state: $state, services: services) { row, action in
                if let action { self.sheet = .lifecycle(row, action) }
                else { self.sheet = nil; paths[tab, default: []].append(.subscription(row.id)) }
            }
        case .paywall: PaywallView(state: $state, services: services)
        case .pricing(let row): PricingView(row: row, state: $state, services: services)
        case .lifecycle(let row, let action): LifecycleView(row: row, action: action, state: $state, services: services)
        case .category(let original): CategoryEditor(original: original, state: $state, services: services)
        case .cancellation(let id):
            if let row = state.presentation.rows.first(where: { $0.id == id }) { LifecycleView(row: row, action: .cancel, state: $state, services: services) }
        case .prompt(let prompt): PromptView(prompt: prompt, state: $state, services: services)
        case .installmentEditor(let original): InstallmentEditor(original: original, state: $state, services: services)
        case .installmentPayoff(let id):
            if let plan = state.presentation.installments?.first(where: { $0.id == id })?.plan { InstallmentPayoff(plan: plan, state: $state, services: services) }
        case .screenshotImport: ScreenshotImportView(state: $state, services: services)
        }
    }
    private func adopt(_ next: SceneState) {
        guard next.presentation.revision >= state.presentation.revision else { return }
        state.presentation = next.presentation; state.settings = next.settings; state.ready = true
    }
    private func route(_ url: URL) {
        guard booted else { pendingURL = url; return }
        guard let target = DeepLink.route(url) else { return }
        if let newTab = target.tab { tab = newTab }
        if let segment = target.segment { state.listSegment = segment; paths[.subscriptions] = [] }
        if let route = target.route { paths[tab] = [route] }
        if let newSheet = target.sheet { sheet = newSheet }
    }
}

struct PromptView: View {
    let prompt: UserPrompt
    @Binding var state: SceneState
    let services: AppServices
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @State private var paywall = false
    @State private var permission = UNAuthorizationStatus.notDetermined
    @State private var awaitingSettings = false
    @State private var contentHeight: CGFloat = 0
    @State private var actionsHeight: CGFloat = 0
    private var currency: String { state.presentation.preferences.preferredCurrency }
    var body: some View {
        Group {
            if prompt == .reminders {
                offer(message: L("prompt_remindersBody"), note: permission == .denied ? L("native_permissionDenied") : nil,
                      confirm: L(permission == .denied ? "settings_openDeviceSettings" : "prompt_remindersConfirm"),
                      identifiers: ("enableReminderOffer", "skipReminderOffer")) {
                    title(L("prompt_remindersTitle")).accessibilityIdentifier("reminderOfferTitle")
                } detail: {
                    if let row = nextRenewal, let amount = row.nextAmount { reminderPreview(row, amount: amount) }
                } action: {
                    permission = await services.notifications.permission()
                    if permission == .denied {
                        awaitingSettings = true
                        openURL(URL(string: UIApplication.openSettingsURLString)!)
                    } else if try await services.notifications.authorize() {
                        try await enableReminders()
                    } else {
                        permission = await services.notifications.permission()
                    }
                }
            } else {
                offer(message: L("prompt_proBody"), note: nil, confirm: L("prompt_proConfirm"), identifiers: ("openProOffer", "skipProOffer")) {
                    proHero.accessibilityIdentifier("proOfferTitle")
                } detail: {
                    VStack(alignment: .leading, spacing: 14) {
                        ForEach(Self.proFeatures, id: \.self) { feature in
                            Label { Text(L(feature.title)).appFont(17) } icon: { Image(systemName: feature.icon).appFont(17).foregroundStyle(AppTheme.muted) }
                                .labelStyle(PromptFeatureLabelStyle())
                        }
                    }
                } action: { paywall = true }
            }
        }.presentationDetents(typeSize.isAccessibilitySize ? [.large] : contentHeight > 0 ? [.height(contentHeight + actionsHeight)] : [.medium]).appSheet()
            .sheet(isPresented: $paywall, onDismiss: { dismiss() }) { PaywallView(state: $state, services: services) }
            .task(id: scenePhase) {
                guard prompt == .reminders, scenePhase == .active else { return }
                permission = await services.notifications.permission()
                if awaitingSettings && (permission == .authorized || permission == .provisional || permission == .ephemeral) {
                    do { try await enableReminders() }
                    catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
                }
            }
    }
    private static let proFeatures: [ProFeature] = [.reminders, .calendar, .categories, .installments, .widgets]
    private func title(_ text: String) -> some View {
        Text(text).appFont(28, weight: .bold, relativeTo: .title).tracking(-0.4).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
    }
    @ViewBuilder private var proHero: some View {
        if let savings = state.presentation.dashboard.savings, savings.total > 0 {
            VStack(alignment: .leading, spacing: 2) {
                Text(L("home_saved")).appFont(15, relativeTo: .subheadline).foregroundStyle(AppTheme.muted)
                Text(Display.money(savings.total, currency)).appFont(36, weight: .heavy, relativeTo: .largeTitle).tracking(-1.2).monospacedDigit()
                    .foregroundStyle(AppTheme.accentBright).lineLimit(1).minimumScaleFactor(0.6)
                if savings.stopped > 0 {
                    Text(L("home_savedStopped", ["count": String(savings.stopped), "amount": Display.money(savings.monthly, currency, decimals: 0)]))
                        .appFont(15, relativeTo: .subheadline).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true)
                }
            }.accessibilityElement(children: .combine).accessibilityAddTraits(.isHeader)
        } else { title(L("prompt_proTitle")) }
    }
    // The soonest renewal whose day-before reminder is still ahead, so the preview shows one this person would actually get.
    private var nextRenewal: SubscriptionRow? {
        let today = Day.today()
        return state.presentation.rows.filter { $0.status == .active && ($0.nextAmount ?? 0) > 0 && ($0.nextDate ?? .distantPast) > today }
            .min { ($0.nextDate ?? .distantFuture) < ($1.nextDate ?? .distantFuture) }
    }
    private func reminderPreview(_ row: SubscriptionRow, amount: Double) -> some View {
        HStack(alignment: .top, spacing: 11) {
            Image(systemName: "eye.fill").font(.system(size: 17)).foregroundStyle(AppTheme.accent)
                .frame(width: 34, height: 34).appCard(radius: 9, fill: AppTheme.background)
            VStack(alignment: .leading, spacing: 2) {
                Text(L("notif_renewalTitle", ["name": row.subscription.name, "when": L("notif_whenTomorrow")])).appFont(15, weight: .semibold, relativeTo: .subheadline)
                Text(L("notif_renewalBody", ["amount": Display.money(amount, currency)])).appFont(15, relativeTo: .subheadline)
            }.fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
        }.padding(.horizontal, 14).padding(.vertical, 13).appCard(radius: 20, fill: AppTheme.surfaceAlt).accessibilityElement(children: .combine)
    }
    // Sized to its content: a fixed medium detent left a blank band between the copy and the buttons.
    private func offer<Hero: View, Detail: View>(message: String, note: String?, confirm: String, identifiers: (confirm: String, skip: String),
                                                 @ViewBuilder hero: () -> Hero, @ViewBuilder detail: () -> Detail,
                                                 action: @escaping @MainActor () async throws -> Void) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                hero()
                Text(message).appFont(17).fixedSize(horizontal: false, vertical: true).padding(.top, 20)
                detail().padding(.top, 24)
                if let note { Text(note).appFont(15, relativeTo: .subheadline).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true).padding(.top, 16) }
            }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 24).padding(.top, 32).padding(.bottom, 8)
                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { contentHeight = $0 }
        }.scrollBounceBehavior(.basedOnSize).appScreen()
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: 4) {
                ActionButton(title: confirm, action: action).buttonStyle(AppPrimaryButtonStyle()).accessibilityIdentifier(identifiers.confirm)
                Button(L("prompt_notNow")) { dismiss() }
                    .font(.body.weight(.medium)).foregroundStyle(AppTheme.muted)
                    .frame(maxWidth: .infinity, minHeight: 48).contentShape(Rectangle())
                    .accessibilityIdentifier(identifiers.skip)
            }.padding(.horizontal, 24).padding(.top, 16).background(AppTheme.background)
                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { actionsHeight = $0 }
        }
    }
    private func enableReminders() async throws {
        var settings = state.settings.reminders
        settings.renewals = true; settings.installments = true
        try await services.repository.setSetting("notifications.settings", value: settings)
        state.settings.reminders = settings
        state.reload += 1
        dismiss()
    }
}

private struct PromptFeatureLabelStyle: LabelStyle {
    @ScaledMetric private var iconWidth: CGFloat = 24
    func makeBody(configuration: Configuration) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) { configuration.icon.frame(width: iconWidth); configuration.title.fixedSize(horizontal: false, vertical: true) }
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
                ForEach(state.presentation.installments?.filter { ids.contains($0.id) } ?? []) { row in
                    NavigationLink(value: Route.installment(row.id)) { InstallmentCell(row: row, logos: services.logos, currency: state.presentation.preferences.preferredCurrency) }
                }
            } else {
                ForEach(events) { event in
                    if planning {
                        Button { sheet = .cancellation(event.subscriptionId) } label: { EventCell(event: event, currency: state.presentation.preferences.preferredCurrency, logos: services.logos) }
                    } else {
                        NavigationLink(value: event.owner) { EventCell(event: event, currency: state.presentation.preferences.preferredCurrency, logos: services.logos) }
                            .accessibilityIdentifier("due-" + event.subscriptionId)
                            .swipeActions { if event.installment == nil { Button(L("native_action_cancel")) { sheet = .cancellation(event.subscriptionId) } } }
                    }
                }
                if events.isEmpty { Text(L("native_noRenewals")).foregroundStyle(.secondary) }
            }
        }.navigationTitle(day.flatMap(Day.parse).map { Display.date($0) } ?? L("tabs_subscriptions"))
            .task(id: state.presentation.revision) {
                guard let day = day.flatMap(Day.parse) else { return }
                do {
                    let result = try await services.repository.calendar(from: day, through: day, rates: services.exchange.cached(), now: Date())
                    events = planning ? LiveActivityService.renewalEvents(result).filter { event in state.presentation.rows.first(where: { $0.id == event.subscriptionId })?.allowedActions.contains(.cancel) == true } : result
                }
                catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
            }
    }
}
