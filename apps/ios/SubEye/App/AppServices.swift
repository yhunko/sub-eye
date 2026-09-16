import Foundation
import SubEyeCore

@MainActor
final class AppServices {
    let repository: SubscriptionRepository
    let logos: LogoService
    let brands = BrandService()
    let exchange: ExchangeRateService
    let legacy: LegacyMMKVReader
    let cache: LaunchCacheWriter
    let initial: Presentation
    lazy var notifications = NotificationService()
    let widget = WidgetPublisher()
    lazy var live = LiveActivityService(repository: repository)
    lazy var purchases = PurchaseService(repository: repository)
    lazy var cloud = CloudService(repository: repository)
    lazy var prompts = PromptCoordinator(repository: repository)

    init(directory: URL) {
        let defaults = Preferences(currency: Locale.current.currency?.identifier.lowercased() ?? "uah", timezone: TimeZone.current.identifier)
        let repository = SubscriptionRepository(url: directory.appendingPathComponent("SubEye.sqlite"), defaults: defaults)
        self.repository = repository
        logos = LogoService(directory: directory.appendingPathComponent("logos"), repository: repository)
        exchange = ExchangeRateService(repository: repository)
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        legacy = LegacyMMKVReader(source: (NativeTesting.enabled ? directory : documents).appendingPathComponent("mmkv"), staging: directory.appendingPathComponent("legacy-copies"))
        let cacheURL = directory.appendingPathComponent("launch.json")
        cache = LaunchCacheWriter(url: cacheURL)
        initial = LaunchCache.read(at: cacheURL) ?? Presentation(preferences: defaults)
    }

    func load() async throws -> SceneState {
        if try await repository.migrationReceipt() == nil {
            let snapshot = try await legacy.read()
            _ = try await repository.migrate(snapshot, now: Date())
        }
        try await NativeTesting.seed(repository)
        return try await refresh()
    }

    func refresh() async throws -> SceneState {
        let rates = try await exchange.cached()
        let presentation = try await repository.presentation(rates: rates, now: Date())
        var settings = DeviceSettings()
        settings.pro = try await repository.setting("pro.entitled", as: Bool.self) ?? false
        settings.cloud = try await repository.setting("cloud.sync", as: Bool.self) ?? false
        settings.liveActivities = try await repository.setting("live.enabled", as: Bool.self) ?? false
        settings.reminders = try await repository.setting("notifications.settings", as: ReminderSettings.self) ?? ReminderSettings()
        if try await repository.setting("notifications.settings", as: ReminderSettings.self) == nil {
            settings.reminders.renewals = try await repository.setting("notifications.renewalReminders", as: Bool.self) ?? false
        }
        settings.list = try await repository.setting("subs.filters", as: ListOptions.self) ?? ListOptions()
        settings.calendar = try await repository.setting("calendar.settings", as: CalendarOptions.self) ?? CalendarOptions()
        do { try await cache.write(presentation) }
        catch { Performance.signposts.emitEvent("LaunchCacheWriteFailed") }
        return SceneState(presentation: presentation, settings: settings, ready: true)
    }

    func externalUpdates() async -> Bool {
        guard !NativeTesting.enabled else { return false }
        var issue = false
        do { _ = try await exchange.refresh(now: Date()) } catch { issue = true }
        guard !Task.isCancelled else { return issue }
        do { try await cloud.link() } catch { issue = true }
        guard !Task.isCancelled else { return issue }
        do { _ = try await purchases.refresh() } catch { issue = true }
        return issue
    }

    func erase() async throws -> Bool {
        try await repository.erase(additionalCloudKeys: cloud.keysForErase())
        try await live.setEnabled(false)
        await notifications.erase()
        await widget.erase()
        await logos.cancelPending()
        try await cache.erase()
        try await logos.erase()
        try await legacy.eraseAfterMigration()
        do { try await cloud.push(); return true }
        catch { return false }
    }

    func synchronizeSurfaces(_ state: SceneState) async throws {
        guard !NativeTesting.enabled else { return }
        try await widget.publish(state.presentation, pro: state.settings.pro, logos: logos)
        let rates = try await exchange.cached()
        try await notifications.synchronize(model: state.presentation, settings: state.settings.reminders, pro: state.settings.pro, rates: rates)
        try await live.synchronize(model: state.presentation, rates: rates, logos: logos)
    }
}
