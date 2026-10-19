import Combine
import UIKit
@preconcurrency import UserNotifications
import SubEyeCore

actor NotificationService {
    private let center = UNUserNotificationCenter.current()
    private var generation = 0
    private var scheduling: Task<Void, Error>?
    func permission() async -> UNAuthorizationStatus { await center.notificationSettings().authorizationStatus }
    func authorize() async throws -> Bool { try await center.requestAuthorization(options: [.alert, .sound, .badge]) }
    func pendingCount() async -> Int { await center.pendingNotificationRequests().filter { $0.identifier.hasPrefix("subeye:") }.count }
    func nextFireDate() async -> Date? {
        await center.pendingNotificationRequests().filter { $0.identifier.hasPrefix("subeye:") }
            .compactMap { request in
                if let trigger = request.trigger as? UNCalendarNotificationTrigger { return trigger.nextTriggerDate() }
                return (request.trigger as? UNTimeIntervalNotificationTrigger)?.nextTriggerDate()
            }.min()
    }
    func synchronize(model: Presentation, settings: ReminderSettings, pro: Bool, rates: ExchangeRates) async throws {
        generation += 1; let current = generation
        let previous = scheduling
        let task = Task {
            _ = try? await previous?.value
            try Task.checkCancellation()
            try await self.replaceSchedule(model: model, settings: settings, pro: pro, rates: rates, generation: current)
        }
        scheduling = task
        defer { if current == generation { scheduling = nil } }
        try await withTaskCancellationHandler { try await task.value } onCancel: { task.cancel() }
    }
    private func replaceSchedule(model: Presentation, settings: ReminderSettings, pro: Bool, rates: ExchangeRates, generation: Int) async throws {
        guard generation == self.generation else { return }
        let permission = await permission()
        guard permission == .authorized || permission == .provisional else { return }
        let planned = ReminderPlanner.plan(rows: model.rows, settings: settings, pro: pro, rates: rates, currency: model.preferences.preferredCurrency, now: Date(), zone: .current)
        let previous = await center.pendingNotificationRequests()
        let identifiers = Set(planned.map { "subeye:" + $0.id })
        let currency = model.preferences.preferredCurrency
        for reminder in planned {
            try Task.checkCancellation(); guard generation == self.generation else { return }
            let content = UNMutableNotificationContent()
            let message = reminder.message(L, money: { Display.money($0, currency) })
            content.title = message.title; content.body = message.body
            content.sound = .default; content.threadIdentifier = "subeye-renewals"
            content.userInfo = ["url": Self.destination(reminder.events.map(\.subscriptionId)).absoluteString]
            let trigger: UNCalendarNotificationTrigger
            if let rule = reminder.repeatRule { trigger = UNCalendarNotificationTrigger(dateMatching: rule.components, repeats: true) }
            else { trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: reminder.fireAt), repeats: false) }
            try await center.add(UNNotificationRequest(identifier: "subeye:" + reminder.id, content: content, trigger: trigger))
        }
        try Task.checkCancellation(); guard generation == self.generation else { return }
        // Replace Expo requests only after the native schedule has succeeded.
        center.removePendingNotificationRequests(withIdentifiers: previous.map(\.identifier).filter { !identifiers.contains($0) })
    }
    static func destination(_ ids: [String]) -> URL {
        if ids.count == 1, let id = ids.first { return AppConfiguration.url("subscriptions/" + id) }
        var url = URLComponents(url: AppConfiguration.url("subscriptions"), resolvingAgainstBaseURL: false)!
        url.queryItems = [URLQueryItem(name: "ids", value: ids.joined(separator: ","))]
        return url.url!
    }
    func test() async throws {
        guard try await authorize() else { throw DomainError.illegalAction }
        let content = UNMutableNotificationContent(); content.title = L("native_testTitle"); content.body = L("native_testBody"); content.sound = .default
        content.userInfo = ["url": AppConfiguration.url("settings/notifications").absoluteString]
        try await center.add(UNNotificationRequest(identifier: "subeye:test", content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: 3, repeats: false)))
    }
    func erase() async {
        generation += 1; let current = generation
        let previous = scheduling; previous?.cancel()
        let task = Task<Void, Error> {
            _ = try? await previous?.value
            center.removeAllPendingNotificationRequests(); center.removeAllDeliveredNotifications()
        }
        scheduling = task
        _ = try? await task.value
        if current == generation { scheduling = nil }
    }
}

@MainActor final class NotificationInbox: ObservableObject { @Published var url: URL? }

@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    let inbox = NotificationInbox()
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let raw = response.notification.request.content.userInfo["url"] as? String
        await MainActor.run { if let raw, let url = URL(string: raw) { inbox.url = url } }
    }
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions { [.banner, .sound] }
}
