import Combine
import UIKit
@preconcurrency import UserNotifications
import SubEyeCore

actor NotificationService {
    private let center = UNUserNotificationCenter.current()
    private var generation = 0
    private var scheduling: Task<Void, Error>?
    func permission() async -> UNAuthorizationStatus { await center.notificationSettings().authorizationStatus }
    func allowed() async -> Bool { [.authorized, .provisional, .ephemeral].contains(await permission()) }
    func authorize() async throws -> Bool { try await center.requestAuthorization(options: [.alert, .sound, .badge]) }
    func pendingCount() async -> Int { await center.pendingNotificationRequests().filter { $0.identifier.hasPrefix("subeye:") }.count }
    func nextFireDate() async -> Date? {
        await center.pendingNotificationRequests().filter { $0.identifier.hasPrefix("subeye:") }
            .compactMap { request in
                if let trigger = request.trigger as? UNCalendarNotificationTrigger { return trigger.nextTriggerDate() }
                return (request.trigger as? UNTimeIntervalNotificationTrigger)?.nextTriggerDate()
            }.min()
    }
    func synchronize(model: Presentation, installments: [InstallmentPlan], settings: ReminderSettings, pro: Bool, rates: ExchangeRates) async throws {
        generation += 1; let current = generation
        let previous = scheduling
        let task = Task {
            _ = try? await previous?.value
            try Task.checkCancellation()
            try await self.replaceSchedule(model: model, installments: installments, settings: settings, pro: pro, rates: rates, generation: current)
        }
        scheduling = task
        defer { if current == generation { scheduling = nil } }
        try await withTaskCancellationHandler { try await task.value } onCancel: { task.cancel() }
    }
    private func replaceSchedule(model: Presentation, installments: [InstallmentPlan], settings: ReminderSettings, pro: Bool, rates: ExchangeRates, generation: Int) async throws {
        guard generation == self.generation else { return }
        let permission = await permission()
        guard permission == .authorized || permission == .provisional else { return }
        let planned = ReminderPlanner.plan(rows: model.rows, installments: installments, settings: settings, pro: pro, rates: rates,
                                           currency: model.preferences.preferredCurrency, now: Date(), zone: .current)
        let previous = await center.pendingNotificationRequests()
        let identifiers = Set(planned.map { "subeye:" + $0.id })
        for reminder in planned {
            try Task.checkCancellation(); guard generation == self.generation else { return }
            let trigger: UNCalendarNotificationTrigger
            if let rule = reminder.repeatRule { trigger = UNCalendarNotificationTrigger(dateMatching: rule.components, repeats: true) }
            else { trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: reminder.fireAt), repeats: false) }
            try await center.add(UNNotificationRequest(identifier: "subeye:" + reminder.id, content: Self.content(reminder, currency: model.preferences.preferredCurrency), trigger: trigger))
        }
        try Task.checkCancellation(); guard generation == self.generation else { return }
        // Replace Expo requests only after the native schedule has succeeded. Previews are left alone: granting permission
        // cycles the scene, and the synchronize that follows would otherwise remove them before they fire.
        center.removePendingNotificationRequests(withIdentifiers: previous.map(\.identifier).filter { !identifiers.contains($0) && !$0.hasPrefix("subeye:preview-") })
    }
    private static func content(_ reminder: PlannedReminder, currency: String) -> UNMutableNotificationContent {
        let content = UNMutableNotificationContent()
        let message = reminder.message(L, money: { Display.money($0, currency) })
        content.title = message.title; content.body = message.body
        let installment = reminder.kind.hasPrefix("installment")
        content.sound = .default; content.threadIdentifier = installment ? "subeye-installments" : "subeye-renewals"
        content.userInfo = ["url": destination(reminder.events.map(\.subscriptionId), installments: installment).absoluteString]
        return content
    }
    #if NATIVE_DEVELOPMENT
    // Delivers one planned reminder of each shape (single renewal, digest, trial, license updates, installment, last installment, paid off)
    // within seconds, with every kind switched on whatever the saved switches say.
    func preview(model: Presentation, pro: Bool, rates: ExchangeRates) async throws -> Int {
        guard try await authorize() else { throw DomainError.illegalAction }
        var settings = ReminderSettings(); settings.renewals = true; settings.trials = true; settings.installments = true
        let planned = ReminderPlanner.plan(rows: model.rows, installments: model.installments?.map(\.plan) ?? [], settings: settings, pro: pro, rates: rates,
                                           currency: model.preferences.preferredCurrency, now: Date(), zone: .current)
        let shapes = Self.previewShapes(planned)
        for (index, reminder) in shapes.enumerated() {
            try await center.add(UNNotificationRequest(identifier: "subeye:preview-" + String(index), content: Self.content(reminder, currency: model.preferences.preferredCurrency),
                                                       trigger: UNTimeIntervalNotificationTrigger(timeInterval: Double(3 + index * 3), repeats: false)))
        }
        return shapes.count
    }
    // Previews come on top of a full schedule, and iOS silently drops whatever falls past its 64 pending requests.
    static func previewShapes(_ planned: [PlannedReminder]) -> [PlannedReminder] {
        let shapes = [planned.first { $0.kind == "renewal" && $0.events.count == 1 }, planned.first { $0.kind == "renewal" && $0.events.count > 1 },
                      planned.first { $0.kind == "trial" }, planned.first { $0.kind == "updates" }, planned.first { $0.kind == "installment" },
                      planned.first { $0.kind == "installmentFinal" }, planned.first { $0.kind == "installmentPaidOff" }].compactMap { $0 }
        return Array(shapes.prefix(64 - ReminderPlanner.budget))
    }
    #endif
    static func destination(_ ids: [String], installments: Bool) -> URL {
        if installments { return AppConfiguration.url(ids.count == 1 ? "installments/" + ids[0] : "installments") }
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
