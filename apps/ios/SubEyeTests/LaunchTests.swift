import XCTest
import SubEyeCore
@testable import SubEye

final class LaunchTests: XCTestCase {
    func testDevelopmentDoesNotUseProductionDatabase() {
        XCTAssertEqual(AppConfiguration.namespace, "native-development")
        XCTAssertEqual(AppConfiguration.scheme, "subeyenative")
    }
}

extension LaunchTests {
    @MainActor
    func testReminderOfferEligibilityAndOneTimePersistence() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let repository = SubscriptionRepository(url: directory.appendingPathComponent("test.sqlite"))
        let prompts = PromptCoordinator(repository: repository)
        var enabled = DeviceSettings(); enabled.reminders.renewals = true
        let alreadyEnabled = try await prompts.afterCreation(settings: enabled, permissionAllowsNotifications: true)
        XCTAssertFalse(alreadyEnabled)
        let home = try await prompts.home(tracked: 3, settings: enabled, now: Date(), permissionAllowsNotifications: false)
        XCTAssertNil(home, "Home must reserve the session for the Save offer when system notifications are blocked")
        let denied = try await prompts.afterCreation(settings: enabled, permissionAllowsNotifications: false)
        XCTAssertTrue(denied, "System denial makes an enabled app toggle ineffective")
        let repeated = try await PromptCoordinator(repository: repository).afterCreation(settings: DeviceSettings(), permissionAllowsNotifications: false)
        XCTAssertFalse(repeated, "Declining the offer must survive the next launch")
        try await repository.setSetting("prompts.remindersAsked", value: false)
        let off = try await PromptCoordinator(repository: repository).afterCreation(settings: DeviceSettings(), permissionAllowsNotifications: true)
        XCTAssertTrue(off, "Permission alone does not enable renewal reminders")
    }
}
