import SwiftUI
import StoreKit
import UniformTypeIdentifiers
import SubEyeCore

struct ArchiveDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var bytes: Data
    init(bytes: Data = Data()) { self.bytes = bytes }
    init(configuration: ReadConfiguration) throws { bytes = configuration.file.regularFileContents ?? Data() }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper { FileWrapper(regularFileWithContents: bytes) }
}

struct SettingsView: View {
    @Binding var state: SceneState
    let services: AppServices
    @Binding var sheet: SheetRoute?
    @State private var archive = ArchiveDocument()
    @State private var exporting = false
    @State private var importing = false
    @State private var importURL: URL?
    @State private var erase = false
    @State private var syncTimezone = false
    @State private var timezoneChange: UUID?
    @State private var cloudChange = 0
    @State private var storePage = 0
    private var currencyLabel: String {
        let code = state.presentation.preferences.preferredCurrency.uppercased()
        let flag = Display.currencyFlag(code)
        return flag + " " + code
    }
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                if let update = state.update, update.banner {
                    UpdateCard(release: update.release) {
                        state.update?.banner = false
                        Task { try? await services.updates.dismiss(update.release.version) }
                    }
                }
                AppSection(footnote: L(state.settings.pro ? "settings_proActiveHint" : "settings_proPitch")) {
                    Button { sheet = .paywall } label: {
                        SettingsRow(icon: state.settings.pro ? "checkmark.seal.fill" : "sparkles", title: L("paywall_title"), value: L(state.settings.pro ? "settings_proActive" : "paywall_unlock"), chevron: !state.settings.pro)
                    }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    ActionButton(title: L("settings_restore"), icon: "arrow.clockwise", styledRow: true) {
                        let restored = try await services.purchases.restore(); state.settings.pro = restored; state.reload += 1
                        state.notice = Notice(title: L("settings_restore"), message: L(restored ? "paywall_restoreDone" : "paywall_restoreNone"))
                    }.buttonStyle(.plain)
                }
                AppSection(title: L("settings_preferences"), footnote: L("settings_deviceHint")) {
                    RouteLink(value: Route.currency) { SettingsRow(icon: "creditcard", title: L("settings_currency"), value: currencyLabel) }.buttonStyle(.plain).accessibilityIdentifier("settingsCurrency")
                    AppDivider(inset: 47)
                    if state.presentation.preferences.preferredTimezone == TimeZone.current.identifier {
                        SettingsRow(icon: "clock", title: L("settings_timezone"), value: state.presentation.preferences.preferredTimezone, chevron: false).accessibilityIdentifier("settingsTimezone")
                    } else {
                        Button { syncTimezone = true } label: { SettingsRow(icon: "clock", title: L("settings_timezone"), value: state.presentation.preferences.preferredTimezone) }.buttonStyle(.plain).disabled(timezoneChange != nil).accessibilityIdentifier("settingsTimezone")
                    }
                    AppDivider(inset: 47)
                    RouteLink(value: Route.categories) { SettingsRow(icon: "tag", title: L("settings_categories"), value: state.settings.pro ? nil : L("paywall_badge")) }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    RouteLink(value: Route.notifications) {
                        let reminders = state.settings.reminders, on = reminders.renewals || reminders.trials || reminders.installments
                        SettingsRow(icon: on ? "bell" : "bell.slash", title: L("settings_reminders"), value: L(on ? "settings_on" : "settings_off"))
                    }.buttonStyle(.plain).accessibilityIdentifier("notificationSettings")
                    AppDivider(inset: 47)
                    Link(destination: URL(string: UIApplication.openSettingsURLString)!) {
                        SettingsRow(icon: "globe", title: L("settings_language"), value: Bundle.main.preferredLocalizations.first == "uk" ? "Українська" : "English")
                    }.buttonStyle(.plain)
                }
                AppSection(title: L("settings_data"), footnote: L("settings_syncHint")) {
                    Toggle(isOn: $state.settings.cloud) {
                        HStack(spacing: 12) {
                            RowIcon(symbol: state.settings.cloud ? "icloud.fill" : "icloud.slash")
                            VStack(alignment: .leading, spacing: 2) {
                                Text(L("settings_sync")).appFont(16)
                                if !state.settings.cloud { Text(L("settings_syncOffSubtitle")).appFont(12.5).foregroundStyle(AppTheme.muted) }
                            }
                        }
                    }.padding(.horizontal, 16).padding(.vertical, 8).onChange(of: state.settings.cloud) { _ in cloudChange += 1 }
                    AppDivider(inset: 47)
                    ActionButton(title: L("native_export"), icon: "square.and.arrow.up", styledRow: true) { archive = ArchiveDocument(bytes: try await services.repository.exportArchive()); exporting = true }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    Button { importing = true } label: { SettingsRow(icon: "square.and.arrow.down", title: L("native_import"), color: AppTheme.accentBright, chevron: false) }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    Button { erase = true } label: { SettingsRow(icon: "trash", title: L("settings_erase"), color: AppTheme.danger, chevron: false) }.buttonStyle(.plain)
                }
                if state.serviceIssue != nil { Text(L("native_serviceIssue")).appFont(12.5).foregroundStyle(AppTheme.muted) }
                AppSection(footnote: L("settings_rateHint")) {
                    Link(destination: URL(string: "https://apps.apple.com/app/id6795566917?action=write-review")!) {
                        SettingsRow(icon: "star", title: L("settings_rate"), color: AppTheme.accentBright, chevron: false)
                    }.buttonStyle(.plain)
                }
                AppSection(title: L("settings_legal")) {
                    RouteLink(value: Route.legal("terms-of-service")) { SettingsRow(icon: "doc.text", title: L("settings_terms")) }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    RouteLink(value: Route.legal("privacy-policy")) { SettingsRow(icon: "hand.raised", title: L("settings_privacy")) }.buttonStyle(.plain)
                }
                #if NATIVE_DEVELOPMENT
                AppSection(title: "Development") {
                    RouteLink(value: Route.developer) {
                        SettingsRow(icon: "hammer", title: "Developer Tools")
                    }.buttonStyle(.plain)
                }
                #endif
                VStack(spacing: 2) {
                    let version = "SubEye " + (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")
                    if let update = state.update {
                        Button(version + " · " + L("update_to", ["version": update.release.version])) { storePage += 1 }
                            .foregroundStyle(AppTheme.accentBright).frame(minHeight: 44)
                    } else { Text(version) }
                    Text(L("settings_madeInUkraine"))
                }.appFont(12.5).foregroundStyle(AppTheme.muted).multilineTextAlignment(.center)
            }.padding(16).padding(.bottom, 8)
        }.appScreen().navigationTitle(L("settings_title")).appStoreProductPage(storePage)
            .confirmationDialog(L("settings_timezone"), isPresented: $syncTimezone, titleVisibility: .visible) {
                Button(L("settings_timezoneUseDevice")) { timezoneChange = UUID() }
                Button(L("common_cancel"), role: .cancel) {}
            } message: { Text(TimeZone.current.identifier) }
            .task(id: timezoneChange) {
                guard timezoneChange != nil else { return }
                do {
                    var preferences = state.presentation.preferences; preferences.preferredTimezone = TimeZone.current.identifier
                    try await services.repository.savePreferences(preferences); state.reload += 1
                } catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
                timezoneChange = nil
            }
            .sheet(isPresented: $erase) { ConfirmAction(title: L("settings_eraseConfirmTitle"), message: L(state.settings.cloud ? "settings_eraseConfirmCloud" : "settings_eraseConfirmBody"), destructive: true) {
                let synchronized = try await services.erase(); state.reload += 1
                if !synchronized { state.notice = Notice(title: L("settings_sync"), message: L("native_erasedOffline")) }
            } }
            .sheet(isPresented: Binding(get: { importURL != nil }, set: { if !$0 { importURL = nil } })) {
                ConfirmAction(title: L("native_importTitle"), message: L("native_importBody")) {
                    guard let url = importURL else { return }
                    try await ArchiveReader.importFile(url, repository: services.repository)
                    state.reload += 1; importURL = nil
                }
            }
            .fileExporter(isPresented: $exporting, document: archive, contentType: .json, defaultFilename: "SubEye-" + Day.key(Date())) { result in
                if case .failure(let error) = result { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
            }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
                switch result { case .success(let url): importURL = url; case .failure(let error): state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
            }
            .task(id: cloudChange) {
                guard cloudChange > 0 else { return }
                do { try await services.repository.setSetting("cloud.sync", value: state.settings.cloud); try await services.cloud.link(); state.reload += 1 }
                catch { state.notice = Notice(title: L("native_error"), message: L("settings_syncUnavailableHint")) }
            }
    }
}

#if NATIVE_DEVELOPMENT
struct DeveloperView: View {
    @Binding var state: SceneState
    let services: AppServices
    @Binding var sheet: SheetRoute?
    @Environment(\.requestReview) private var requestReview
    @AppStorage(DeveloperTextSize.key) private var textSize = DeveloperTextSize.system.rawValue
    @State private var previewCount = 0
    @State private var emptying = false
    @State private var reminders: Int?
    @State private var fakeUpdate = false
    @State private var fakeUpdateChange = 0
    @State private var change: DeveloperOverride?
    // The busiest upcoming payment day this month, so the day list shows several rows when there are any.
    private var paymentDay: String? {
        let today = Day.today()
        let payments = state.presentation.dashboard.monthEvents.filter { $0.kind == .payment && $0.date >= today }
        let busiest = Dictionary(grouping: payments) { Day.key($0.date) }.max { $0.value.count == $1.value.count ? $0.key > $1.key : $0.value.count < $1.value.count }?.key
        return busiest ?? state.presentation.rows.compactMap(\.nextDate).filter { $0 >= today }.min().map(Day.key)
    }
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                AppSection(title: "Data", footnote: "Portfolio adds or resets 14 subscriptions in five categories: four currencies, every two weeks to yearly, a trial, an intro history, a scheduled increase, paused, cancelling and ended; three installment plans: monobank pay in parts in hryvnias, Klarna every two weeks in euros and a dollar loan with a purchase price; and turns Pro on. Start empty deletes every subscription, installment plan and category but keeps settings; Remove developer data deletes only what this screen added and the Pro override.") {
                    SettingsRow(icon: "tray.full", title: "Subscriptions in store", value: String(state.presentation.totalCount), chevron: false)
                    AppDivider(inset: 47)
                    ActionButton(title: "Seed portfolio", icon: "sparkles", styledRow: true) {
                        try await NativeTesting.seedPortfolio(services.repository); state.reload += 1
                    }.buttonStyle(.plain).accessibilityIdentifier("seedPortfolio")
                    AppDivider(inset: 47)
                    ActionButton(title: "Add 100 subscriptions", icon: "list.bullet", styledRow: true) {
                        try await NativeTesting.addFixtures(100, to: services.repository); state.reload += 1
                    }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    Button { emptying = true } label: { SettingsRow(icon: "tray", title: "Start empty", color: AppTheme.danger, chevron: false) }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    ActionButton(title: "Remove developer data", role: .destructive, icon: "trash", styledRow: true) {
                        try await NativeTesting.clearDeveloperData(services.repository); state.reload += 1
                    }.buttonStyle(.plain)
                }
                AppSection(title: "Access", footnote: "Pro overrides the store entitlement in this build; Reminders switches the real reminder setting of this development store. Scenario screens carry the same switches under the hammer button, so a change shows on the open screen. Text size overrides Dynamic Type inside the app; navigation and tab bars, menus and alerts keep the system size.") {
                    overrideToggle("Pro features", icon: "sparkles", key: DeveloperOverride.pro).accessibilityIdentifier("developerPro")
                    AppDivider(inset: 47)
                    overrideToggle("Reminders on", icon: "bell", key: DeveloperOverride.reminders).accessibilityIdentifier("developerReminders")
                    AppDivider(inset: 47)
                    Menu {
                        Picker("Text size", selection: $textSize) {
                            ForEach(DeveloperTextSize.allCases, id: \.self) { Text($0.title).tag($0.rawValue) }
                        }
                    } label: {
                        SettingsRow(icon: "textformat.size", title: "Text size", value: (DeveloperTextSize(rawValue: textSize) ?? .system).title, chevron: false)
                    }.buttonStyle(.plain).accessibilityIdentifier("developerTextSize")
                }
                AppSection(title: "Price changes", footnote: "Each row resets its own subscription in the development store and opens the real detail screen, so actions there really run. Open the row again to start over.") {
                    scenarioRows(DeveloperScenario.pricing)
                }
                AppSection(title: "Lifecycle") {
                    scenarioRows(DeveloperScenario.lifecycle)
                }
                AppSection(title: "Home", footnote: "Each row seeds scenario subscriptions and switches to Home. Your own subscriptions still count toward every card.") {
                    scenarioRows(DeveloperScenario.home)
                }
                AppSection(title: "Installments", footnote: "Each row resets its own plan in the development store and opens the real installment detail, so paying off, undoing and deleting really run.") {
                    scenarioRows(DeveloperScenario.installments)
                }
                AppSection(title: "Prompts", footnote: "Each row shows the prompt directly. Reset forgets that reminders, Pro and a rating were already offered, so the editor and Home offer them again on their own schedule.") {
                    Button { sheet = .prompt(.reminders) } label: { SettingsRow(icon: "bell.badge", title: "Reminders offer", chevron: false) }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    Button { sheet = .prompt(.pro) } label: {
                        SettingsRow(icon: "sparkles", title: "Pro pitch", value: (state.presentation.dashboard.savings?.total ?? 0) > 0 ? "With savings" : nil, chevron: false)
                    }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    Button { requestReview() } label: { SettingsRow(icon: "star", title: "Rating request", chevron: false) }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    ActionButton(title: "Reset prompt history", icon: "arrow.counterclockwise", styledRow: true) {
                        for key in ["prompts.remindersAsked", "prompts.proPitched"] { try await services.repository.setSetting(key, value: nil as Bool?) }
                        try await services.repository.setSetting("review.state", value: nil as ReviewState?)
                        services.prompts.interrupted = false
                    }.buttonStyle(.plain)
                }
                AppSection(title: "Screens", footnote: "Day list opens the busiest upcoming payment day, as a multi-charge day on Home does; Plan a cancellation opens the same day the way the Live Activity's cancel button does. Far time zone moves the preferred time zone a day away from this device, which brings up the Settings row that offers to switch back.") {
                    NavigationLink(value: paymentDay.map(Route.due)) { SettingsRow(icon: "calendar.day.timeline.left", title: "Day list", value: paymentDay) }.buttonStyle(.plain).disabled(paymentDay == nil)
                    AppDivider(inset: 47)
                    NavigationLink(value: paymentDay.map(Route.cancellationDay)) { SettingsRow(icon: "xmark.circle", title: "Plan a cancellation") }.buttonStyle(.plain).disabled(paymentDay == nil)
                    AppDivider(inset: 47)
                    ActionButton(title: "Use a far time zone", icon: "clock.arrow.2.circlepath", styledRow: true) {
                        var preferences = state.presentation.preferences
                        preferences.preferredTimezone = TimeZone.current.secondsFromGMT() >= 0 ? "Pacific/Pago_Pago" : "Pacific/Kiritimati"
                        try await services.repository.savePreferences(preferences); state.reload += 1
                    }.buttonStyle(.plain)
                }
                AppSection(title: "Reminders", footnote: "Delivers one real reminder of each shape from the current subscriptions, a few seconds apart: a single renewal, a digest of several, a trial ending (Pro) and a license's updates ending (open a License scenario first); from the current installment plans, a payment due, a last payment and a paid-off notice. Lock the simulator to see them on the Lock Screen.") {
                    ActionButton(title: "Deliver sample reminders", icon: "bell.and.waves.left.and.right", styledRow: true) {
                        reminders = try await services.notifications.preview(model: state.presentation, pro: state.settings.pro, rates: services.exchange.cached())
                    }.buttonStyle(.plain)
                    if let reminders {
                        AppDivider(inset: 47)
                        SettingsRow(icon: reminders > 0 ? "checkmark.circle" : "exclamationmark.triangle", title: reminders > 0 ? "Reminders on the way" : "Nothing to remind about", value: String(reminders), chevron: false)
                    }
                }
                AppSection(title: "Live Activity", footnote: "Previews use current subscriptions. Seed the portfolio first for deterministic routes and avatars, then lock the iPhone and long-press the Dynamic Island.") {
                    SettingsRow(icon: services.live.authorized ? "checkmark.circle" : "exclamationmark.triangle",
                                title: "System permission", value: services.live.authorized ? "Enabled" : "Disabled", chevron: false)
                    AppDivider(inset: 47)
                    SettingsRow(icon: "waveform", title: "Preview activities", value: String(previewCount), chevron: false)
                    AppDivider(inset: 47)
                    ActionButton(title: "Show one renewal", icon: "1.circle", styledRow: true) {
                        try await services.live.showPreview(.single, model: state.presentation, logos: services.logos); previewCount = services.live.previewCount
                    }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    ActionButton(title: "Show grouped renewals", icon: "rectangle.stack", styledRow: true) {
                        try await services.live.showPreview(.multiple, model: state.presentation, logos: services.logos); previewCount = services.live.previewCount
                    }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    ActionButton(title: "Show hidden state", icon: "eye.slash", styledRow: true) {
                        try await services.live.showPreview(.hidden, model: state.presentation, logos: services.logos); previewCount = services.live.previewCount
                    }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    ActionButton(title: "End preview", role: .destructive, icon: "xmark.circle", styledRow: true) {
                        try await services.live.endPreview(); previewCount = services.live.previewCount
                    }.buttonStyle(.plain)
                }
                AppSection(title: "App Update", footnote: "Pretends the App Store has the next minor version, live for three days. Switching it on also forgets this device's dismissal, so the alert, the Settings banner and the tab dot all come back.") {
                    Toggle(isOn: Binding(get: { fakeUpdate }, set: { fakeUpdate = $0; fakeUpdateChange += 1 })) {
                        HStack(spacing: 12) {
                            RowIcon(symbol: "arrow.down.app")
                            Text("Fake available update").appFont(16)
                        }
                    }.padding(.horizontal, 16).padding(.vertical, 8)
                }
                Text("This screen is compiled only into native development builds. Live Activity previews do not change subscriptions or the saved Live Activities preference.")
                    .appFont(12.5).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true)
            }.padding(16)
        }.appScreen().navigationTitle("Developer Tools").task { previewCount = services.live.previewCount }
            .task { fakeUpdate = (try? await services.updates.faking()) ?? false }
            .task(id: fakeUpdateChange) {
                guard fakeUpdateChange > 0 else { return }
                do { try await services.updates.fake(fakeUpdate); state.update = try await services.updates.current(now: Date()) }
                catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
            }
            .sheet(isPresented: $emptying) {
                ConfirmAction(title: "Start empty", message: "Deletes every subscription, installment plan and category in the development store, your own included. Settings stay.", destructive: true) {
                    try await NativeTesting.empty(services.repository); state.reload += 1
                }
            }
            .developerOverride(change, state: $state, services: services)
    }
    private func overrideToggle(_ title: String, icon: String, key: String) -> some View {
        Toggle(isOn: DeveloperOverride.binding(key, state: $state, change: $change)) {
            HStack(spacing: 12) {
                RowIcon(symbol: icon)
                Text(title).appFont(16)
            }
        }.padding(.horizontal, 16).padding(.vertical, 8)
    }
    private func scenarioRows(_ scenarios: [DeveloperScenario]) -> some View {
        ForEach(Array(scenarios.enumerated()), id: \.element) { index, scenario in
            if index > 0 { AppDivider(inset: 47) }
            NavigationLink(value: Route.developerScenario(scenario)) { SettingsRow(icon: scenario.symbol, title: scenario.title) }
                .buttonStyle(.plain).accessibilityIdentifier("scenario-" + scenario.rawValue)
        }
    }
}
#endif

actor ArchiveReader {
    static func importFile(_ url: URL, repository: SubscriptionRepository) async throws {
        let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
        guard (try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? Int.max) <= 20_000_000 else { throw DomainError.invalidDocument("Archive too large") }
        let data = try Data(contentsOf: url)
        try await repository.importArchive(data)
    }
}
