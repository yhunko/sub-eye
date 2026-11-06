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
        let home = try await prompts.home(Presentation(totalCount: 3), settings: enabled, now: Date(), permissionAllowsNotifications: false)
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

extension LaunchTests {
    private static let now = Day.parse("2026-11-03T12:00:00Z")!
    private static func row(_ id: String, first: String, count: Int = 3, created: String, atPurchase: Bool = false, paidOff: String? = nil) -> InstallmentRow {
        var plan = InstallmentPlan(id: id, name: id, symbol: "laptopcomputer", tint: "blue", currency: "usd", total: String(count * 100) + ".00",
                                   payment: "100.00", paymentCount: count, firstPaymentDate: first, now: Day.parse(created)!)
        plan.paidAtPurchase = atPurchase ? true : nil
        plan.paidOffAt = paidOff; plan.payoffAmount = paidOff == nil ? nil : "100.00"
        return Installments.row(plan, today: Day.floor(now), rates: ExchangeRates(), currency: "usd")
    }

    @MainActor
    func testCelebrationNeedsARecentFinishThatSubEyeWatched() {
        func celebrated(_ row: InstallmentRow, already: [String] = []) -> Bool {
            PromptCoordinator.celebration([row], celebrated: already, today: Day.floor(Self.now)) == row.id
        }
        let finished = Self.row("finished", first: "2026-08-20", created: "2026-08-01T09:00:00Z")
        XCTAssertTrue(celebrated(finished), "Last payment two weeks ago on a plan entered in August")
        XCTAssertFalse(celebrated(finished, already: ["finished"]), "A plan is celebrated once")
        XCTAssertTrue(celebrated(Self.row("edge", first: "2026-10-04", count: 1, created: "2026-09-01T09:00:00Z")), "Finished 30 days ago still counts")
        XCTAssertFalse(celebrated(Self.row("old", first: "2026-10-03", count: 1, created: "2026-09-01T09:00:00Z")), "Finished 31 days ago is too long ago")
        XCTAssertFalse(celebrated(Self.row("entered", first: "2026-08-20", created: "2026-11-01T09:00:00Z")), "Entered after it was already paid off")
        XCTAssertFalse(celebrated(Self.row("atPurchase", first: "2026-11-03", count: 1, created: "2026-11-03T10:00:00Z", atPurchase: true)),
                       "A one-payment plan paid at purchase is finished the moment it is entered")
        XCTAssertFalse(celebrated(Self.row("active", first: "2026-10-20", created: "2026-10-01T09:00:00Z")), "Payments still ahead")
        // Saved in Kyiv at 01:30 on the 4th, which is still the 3rd in a preferred New York zone.
        let eastern = Self.row("eastern", first: "2026-11-04", count: 1, created: "2026-11-03T23:30:00Z", atPurchase: true)
        XCTAssertTrue(eastern.finished)
        let newYork = Day.today(Day.parse("2026-11-03T23:30:00Z")!, zone: TimeZone(identifier: "America/New_York")!)
        XCTAssertNil(PromptCoordinator.celebration([eastern], celebrated: [], today: newYork), "A plan paid at purchase east of the preferred zone was never watched")
        XCTAssertTrue(celebrated(Self.row("payoff", first: "2026-10-20", count: 12, created: "2026-10-01T09:00:00Z", paidOff: "2026-11-01")), "Paid off early")
    }

    @MainActor
    func testCelebrationIsUsedUpOnlyByAReviewThatIsShown() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let repository = SubscriptionRepository(url: directory.appendingPathComponent("test.sqlite"))
        let finished = Self.row("finished", first: "2026-08-20", created: "2026-08-01T09:00:00Z")
        let plansOnly = Presentation(preferences: Preferences(currency: "usd", timezone: "UTC"), generatedAt: Self.now, installments: [finished])
        var twoPlans = plansOnly; twoPlans.installments = [finished, Self.row("second", first: "2026-08-25", created: "2026-08-01T09:00:00Z")]
        var settings = DeviceSettings(); settings.pro = true
        func celebrated() async throws -> [String]? { try await repository.setting("installments.celebrated", as: [String].self) }

        let pending = try await PromptCoordinator(repository: repository, sandbox: false).home(plansOnly, settings: settings, now: Self.now)
        XCTAssertNil(pending, "The reminders offer outranks the celebration")
        try await repository.setSetting("prompts.remindersAsked", value: true)
        let interrupted = PromptCoordinator(repository: repository, sandbox: false); interrupted.interrupted = true
        let skipped = try await interrupted.home(plansOnly, settings: settings, now: Self.now)
        XCTAssertNil(skipped)
        let sandboxed = try await PromptCoordinator(repository: repository, sandbox: true).home(plansOnly, settings: settings, now: Self.now)
        XCTAssertNil(sandboxed, "No review is requested in a sandbox build")
        let unused = try await celebrated()
        XCTAssertNil(unused, "A prompt that never showed must not use up the celebration")

        let shown = try await PromptCoordinator(repository: repository, sandbox: false).home(plansOnly, settings: settings, now: Self.now)
        XCTAssertEqual(shown, .review, "Plans alone count as tracked")
        let used = try await celebrated()
        XCTAssertEqual(used, ["finished"])
        let review = try await repository.setting("review.state", as: ReviewState.self)
        XCTAssertEqual(review?.askedAt, Self.now.timeIntervalSince1970 * 1000)
        let cooling = try await PromptCoordinator(repository: repository, sandbox: false).home(twoPlans, settings: settings, now: Self.now)
        XCTAssertNil(cooling, "A second finished plan waits out the review cooldown")
        let unchanged = try await celebrated()
        XCTAssertEqual(unchanged, ["finished"])

        var free = DeviceSettings(); free.reminders = settings.reminders
        var settled = try await repository.setting("review.state", as: ReviewState.self)!
        settled.firstSeenAt = Self.now.addingTimeInterval(-15 * 86_400).timeIntervalSince1970 * 1000
        try await repository.setSetting("review.state", value: settled)
        let pitched = try await PromptCoordinator(repository: repository, sandbox: false).home(twoPlans, settings: free, now: Self.now)
        XCTAssertEqual(pitched, .pro, "While the review cools, a free user gets the Pro pitch")
        let afterPitch = try await celebrated()
        XCTAssertEqual(afterPitch, ["finished"], "The Pro pitch must not use up a celebration")

        settled.askedAt = Self.now.addingTimeInterval(-181 * 86_400).timeIntervalSince1970 * 1000
        try await repository.setSetting("review.state", value: settled)
        let repeated = try await PromptCoordinator(repository: repository, sandbox: false).home(plansOnly, settings: settings, now: Self.now)
        XCTAssertNil(repeated, "A celebrated plan is never celebrated again, even after the cooldown")
    }

    @MainActor
    func testASandboxBuildStillPitchesProWhileAReviewIsDue() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let repository = SubscriptionRepository(url: directory.appendingPathComponent("test.sqlite"))
        let tracked = Presentation(totalCount: 3)
        let due = ReviewState(firstSeenAt: Self.now.addingTimeInterval(-15 * 86_400).timeIntervalSince1970 * 1000)
        try await repository.setSetting("prompts.remindersAsked", value: true)
        try await repository.setSetting("review.state", value: due)

        let shown = try await PromptCoordinator(repository: repository, sandbox: false).home(tracked, settings: DeviceSettings(), now: Self.now)
        XCTAssertEqual(shown, .review, "With both due, a store build asks for the rating first")
        try await repository.setSetting("review.state", value: due)
        let sandboxed = try await PromptCoordinator(repository: repository, sandbox: true).home(tracked, settings: DeviceSettings(), now: Self.now)
        XCTAssertEqual(sandboxed, .pro, "A sandbox build never records the ask, so a due review must not hide the pitch for good")
    }

    @MainActor
    func testInstallmentRemindersAloneAnswerTheRemindersOffer() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let repository = SubscriptionRepository(url: directory.appendingPathComponent("test.sqlite"))
        var installments = DeviceSettings(); installments.reminders.installments = true
        let offered = try await PromptCoordinator(repository: repository).afterCreation(settings: installments, permissionAllowsNotifications: true)
        XCTAssertFalse(offered, "Someone with installment reminders on already said yes to reminders")
    }
}
