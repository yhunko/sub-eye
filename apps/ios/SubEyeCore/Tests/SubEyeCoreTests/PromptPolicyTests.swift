import XCTest
@testable import SubEyeCore

final class PromptPolicyTests: XCTestCase {
    func testMigratedMillisecondClockRequiresWeekAndSixMonthCooldown() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let milliseconds = now.timeIntervalSince1970 * 1000
        XCTAssertFalse(ReviewState().isDue(now: now, tracked: 10))
        XCTAssertFalse(ReviewState(firstSeenAt: milliseconds - 6 * 86_400_000).isDue(now: now, tracked: 3))
        XCTAssertFalse(ReviewState(firstSeenAt: 1, askedAt: milliseconds - 179 * 86_400_000).isDue(now: now, tracked: 3))
        XCTAssertTrue(ReviewState(firstSeenAt: 1, askedAt: milliseconds - 181 * 86_400_000).isDue(now: now, tracked: 3))
        XCTAssertFalse(ReviewState(firstSeenAt: 1).isDue(now: now, tracked: 2))
    }
    func testOneInterruptionAndReminderPriority() {
        XCTAssertNil(PromptPolicy.home(tracked: 5, pro: false, proPitched: false, reviewDue: true, interrupted: false, remindersPending: true))
        XCTAssertNil(PromptPolicy.home(tracked: 5, pro: false, proPitched: false, reviewDue: true, interrupted: true, remindersPending: false))
        XCTAssertEqual(PromptPolicy.home(tracked: 5, pro: false, proPitched: false, reviewDue: true, interrupted: false, remindersPending: false), .pro)
        XCTAssertEqual(PromptPolicy.home(tracked: 5, pro: true, proPitched: false, reviewDue: true, interrupted: false, remindersPending: false), .review)
    }
}
