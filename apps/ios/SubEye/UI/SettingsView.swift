import SwiftUI
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
    private var currencyLabel: String {
        let code = state.presentation.preferences.preferredCurrency.uppercased()
        let flag = Display.currencyFlag(code)
        return flag + " " + code
    }
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
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
                    NavigationLink(value: Route.currency) { SettingsRow(icon: "creditcard", title: L("settings_currency"), value: currencyLabel) }.buttonStyle(.plain).accessibilityIdentifier("settingsCurrency")
                    AppDivider(inset: 47)
                    if state.presentation.preferences.preferredTimezone == TimeZone.current.identifier {
                        SettingsRow(icon: "clock", title: L("settings_timezone"), value: state.presentation.preferences.preferredTimezone, chevron: false).accessibilityIdentifier("settingsTimezone")
                    } else {
                        Button { syncTimezone = true } label: { SettingsRow(icon: "clock", title: L("settings_timezone"), value: state.presentation.preferences.preferredTimezone) }.buttonStyle(.plain).disabled(timezoneChange != nil).accessibilityIdentifier("settingsTimezone")
                    }
                    AppDivider(inset: 47)
                    NavigationLink(value: Route.categories) { SettingsRow(icon: "tag", title: L("settings_categories"), value: state.settings.pro ? nil : L("paywall_badge")) }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    NavigationLink(value: Route.notifications) {
                        SettingsRow(icon: state.settings.reminders.renewals ? "bell" : "bell.slash", title: L("settings_reminders"), value: L(state.settings.reminders.renewals || state.settings.reminders.trials ? "settings_on" : "settings_off"))
                    }.buttonStyle(.plain).accessibilityIdentifier("notificationSettings")
                    AppDivider(inset: 47)
                    Link(destination: URL(string: UIApplication.openSettingsURLString)!) {
                        SettingsRow(icon: "globe", title: L("settings_language"), value: Bundle.main.preferredLocalizations.first == "uk" ? "Українська" : "English")
                    }.buttonStyle(.plain)
                }
                AppSection(title: L("settings_data"), footnote: L("settings_syncHint")) {
                    Toggle(isOn: $state.settings.cloud) {
                        HStack(spacing: 12) {
                            Image(systemName: state.settings.cloud ? "icloud.fill" : "icloud.slash").appFont(19).foregroundStyle(AppTheme.muted).frame(width: 19)
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
                    NavigationLink(value: Route.legal("terms-of-service")) { SettingsRow(icon: "doc.text", title: L("settings_terms")) }.buttonStyle(.plain)
                    AppDivider(inset: 47)
                    NavigationLink(value: Route.legal("privacy-policy")) { SettingsRow(icon: "hand.raised", title: L("settings_privacy")) }.buttonStyle(.plain)
                }
                VStack(spacing: 2) {
                    Text("SubEye " + (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""))
                    Text(L("settings_madeInUkraine"))
                }.appFont(12.5).foregroundStyle(AppTheme.muted).multilineTextAlignment(.center)
            }.padding(16).padding(.bottom, 8)
        }.appScreen().navigationTitle(L("settings_title"))
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

actor ArchiveReader {
    static func importFile(_ url: URL, repository: SubscriptionRepository) async throws {
        let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
        guard (try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? Int.max) <= 20_000_000 else { throw DomainError.invalidDocument("Archive too large") }
        let data = try Data(contentsOf: url)
        try await repository.importArchive(data)
    }
}
