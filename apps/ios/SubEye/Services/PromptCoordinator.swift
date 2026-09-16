import Foundation
import SubEyeCore

@MainActor
final class PromptCoordinator {
    private let repository: SubscriptionRepository
    private var interrupted = false
    init(repository: SubscriptionRepository) { self.repository = repository }

    func afterCreation(settings: DeviceSettings) async throws -> Bool {
        guard !NativeTesting.enabled, !interrupted, try await remindersPending(settings) else { return false }
        interrupted = true
        try await repository.setSetting("prompts.remindersAsked", value: true)
        return true
    }

    func home(tracked: Int, settings: DeviceSettings, now: Date) async throws -> UserPrompt? {
        guard !NativeTesting.enabled, tracked > 0 else { return nil }
        var review = try await repository.setting("review.state", as: ReviewState.self) ?? ReviewState()
        if review.firstSeenAt == 0 {
            review.firstSeenAt = now.timeIntervalSince1970 * 1000
            try await repository.setSetting("review.state", value: review)
        }
        let proPitched = try await repository.setting("prompts.proPitched", as: Bool.self) ?? false
        let decision = try await PromptPolicy.home(tracked: tracked, pro: settings.pro, proPitched: proPitched,
            reviewDue: review.isDue(now: now, tracked: tracked), interrupted: interrupted, remindersPending: remindersPending(settings))
        try Task.checkCancellation()
        guard let decision else { return nil }
        if decision == .review {
            guard Bundle.main.appStoreReceiptURL?.lastPathComponent != "sandboxReceipt" else { return nil }
            review.askedAt = now.timeIntervalSince1970 * 1000
            try await repository.setSetting("review.state", value: review)
        } else { try await repository.setSetting("prompts.proPitched", value: true) }
        interrupted = true
        return decision
    }

    private func remindersPending(_ settings: DeviceSettings) async throws -> Bool {
        let asked = try await repository.setting("prompts.remindersAsked", as: Bool.self) ?? false
        return !asked && !settings.reminders.renewals && !settings.reminders.trials
    }
}
