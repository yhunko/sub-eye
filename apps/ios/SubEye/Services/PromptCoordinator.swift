import Foundation
import SubEyeCore

@MainActor
final class PromptCoordinator {
    private let repository: SubscriptionRepository
    private let sandbox: Bool
    var interrupted = false
    init(repository: SubscriptionRepository, sandbox: Bool = Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt") {
        self.repository = repository; self.sandbox = sandbox
    }

    func afterCreation(settings: DeviceSettings, permissionAllowsNotifications: Bool) async throws -> Bool {
        guard (!NativeTesting.enabled || NativeTesting.reminderPromptEnabled), !interrupted,
              try await remindersPending(settings, permissionAllowsNotifications: permissionAllowsNotifications) else { return false }
        interrupted = true
        try await repository.setSetting("prompts.remindersAsked", value: true)
        return true
    }

    func home(_ model: Presentation, settings: DeviceSettings, now: Date, permissionAllowsNotifications: Bool = true) async throws -> UserPrompt? {
        let tracked = model.totalCount + model.installmentCount
        guard !NativeTesting.enabled, tracked > 0 else { return nil }
        var review = try await repository.setting("review.state", as: ReviewState.self) ?? ReviewState()
        if review.firstSeenAt == 0 {
            review.firstSeenAt = now.timeIntervalSince1970 * 1000
            try await repository.setSetting("review.state", value: review)
        }
        let proPitched = try await repository.setting("prompts.proPitched", as: Bool.self) ?? false
        let celebrated = try await repository.setting("installments.celebrated", as: [String].self) ?? []
        let zone = TimeZone(identifier: model.preferences.preferredTimezone) ?? .current
        let celebration = Self.celebration(model.installments ?? [], celebrated: celebrated, today: Day.today(now, zone: zone))
        let decision = try await PromptPolicy.home(saved: model.dashboard.savings?.total ?? 0, firstSeenAt: review.firstSeenAt, now: now, pro: settings.pro, proPitched: proPitched,
            reviewDue: review.isDue(now: now, tracked: tracked), interrupted: interrupted, remindersPending: remindersPending(settings, permissionAllowsNotifications: permissionAllowsNotifications),
            celebrating: celebration != nil, reviewCooled: review.cooled(now: now))
        try Task.checkCancellation()
        guard let decision else { return nil }
        if decision == .review {
            guard !sandbox else { return nil }
            review.askedAt = now.timeIntervalSince1970 * 1000
            try await repository.setSetting("review.state", value: review)
            if let celebration { try await repository.setSetting("installments.celebrated", value: celebrated + [celebration]) }
        } else { try await repository.setSetting("prompts.proPitched", value: true) }
        interrupted = true
        return decision
    }

    // A plan finished within the last 30 days that SubEye watched being paid. The day after creation must come before the
    // end, the same tolerance a payment paid at purchase gets, so a plan finished the moment it is entered never counts in any zone.
    static func celebration(_ rows: [InstallmentRow], celebrated: [String], today: Date) -> String? {
        rows.first { row in
            guard row.finished, let end = row.endDate, let created = Day.parse(row.plan.createdAt) else { return false }
            return end >= Day.shift(today, days: -30) && Day.shift(Day.floor(created), days: 1) < end && !celebrated.contains(row.id)
        }?.id
    }

    private func remindersPending(_ settings: DeviceSettings, permissionAllowsNotifications: Bool = true) async throws -> Bool {
        let asked = try await repository.setting("prompts.remindersAsked", as: Bool.self) ?? false
        let reminders = settings.reminders
        return !asked && (!permissionAllowsNotifications || (!reminders.renewals && !reminders.trials && !reminders.installments))
    }
}
