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
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        XCTAssertNil(PromptPolicy.home(saved: 10, firstSeenAt: 1, now: now, pro: false, proPitched: false, reviewDue: true, interrupted: false, remindersPending: true))
        XCTAssertNil(PromptPolicy.home(saved: 10, firstSeenAt: 1, now: now, pro: false, proPitched: false, reviewDue: true, interrupted: true, remindersPending: false))
        XCTAssertEqual(PromptPolicy.home(saved: 10, firstSeenAt: 1, now: now, pro: false, proPitched: false, reviewDue: true, interrupted: false, remindersPending: false), .review)
        XCTAssertEqual(PromptPolicy.home(saved: 10, firstSeenAt: 1, now: now, pro: true, proPitched: false, reviewDue: true, interrupted: false, remindersPending: false), .review)
        XCTAssertEqual(PromptPolicy.home(saved: 10, firstSeenAt: 1, now: now, pro: false, proPitched: true, reviewDue: true, interrupted: false, remindersPending: false), .review)
    }
    func testADueReviewOutranksADuePitch() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let settled = now.timeIntervalSince1970 * 1000 - 14 * 86_400_000
        XCTAssertEqual(PromptPolicy.home(saved: 10, firstSeenAt: settled, now: now, pro: false, proPitched: false, reviewDue: true, interrupted: false, remindersPending: false), .review,
                       "Ratings show per storefront and the US one has almost none, so a rating is worth more than the pitch")
        XCTAssertEqual(PromptPolicy.home(saved: 10, firstSeenAt: settled, now: now, pro: false, proPitched: false, reviewDue: false, interrupted: false, remindersPending: false), .pro,
                       "The pitch still runs once the review is not due")
    }
    func testProWaitsForFirstSavingOrTwoWeeksNotForATrackedCount() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let milliseconds = now.timeIntervalSince1970 * 1000
        let fresh = milliseconds - 13 * 86_400_000, settled = milliseconds - 14 * 86_400_000
        XCTAssertNil(PromptPolicy.home(saved: 0, firstSeenAt: fresh, now: now, pro: false, proPitched: false, reviewDue: false, interrupted: false, remindersPending: false),
                     "Tracking subscriptions is not value yet; pitching before a saving or two weeks is the old behaviour")
        XCTAssertNil(PromptPolicy.home(saved: 0, firstSeenAt: 0, now: now, pro: false, proPitched: false, reviewDue: false, interrupted: false, remindersPending: false),
                     "An unrecorded first use must not read as 1970")
        XCTAssertEqual(PromptPolicy.home(saved: 0.01, firstSeenAt: fresh, now: now, pro: false, proPitched: false, reviewDue: false, interrupted: false, remindersPending: false), .pro)
        XCTAssertEqual(PromptPolicy.home(saved: 0, firstSeenAt: settled, now: now, pro: false, proPitched: false, reviewDue: false, interrupted: false, remindersPending: false), .pro)
        XCTAssertNil(PromptPolicy.home(saved: 50, firstSeenAt: settled, now: now, pro: false, proPitched: true, reviewDue: false, interrupted: false, remindersPending: false),
                     "The pitch is once only")
    }
    func testAPaidOffPlanAsksForAReviewOnlyOutsideTheCooldown() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let milliseconds = now.timeIntervalSince1970 * 1000
        XCTAssertTrue(ReviewState().cooled(now: now))
        XCTAssertFalse(ReviewState(firstSeenAt: 1, askedAt: milliseconds - 179 * 86_400_000).cooled(now: now))
        XCTAssertTrue(ReviewState(firstSeenAt: 1, askedAt: milliseconds - 180 * 86_400_000).cooled(now: now))
        func home(interrupted: Bool = false, remindersPending: Bool = false, cooled: Bool = true) -> UserPrompt? {
            PromptPolicy.home(saved: 10, firstSeenAt: 0, now: now, pro: false, proPitched: false, reviewDue: false, interrupted: interrupted,
                              remindersPending: remindersPending, celebrating: true, reviewCooled: cooled)
        }
        XCTAssertEqual(home(), .review, "Paying off a plan outranks the Pro pitch and skips the three-tracked and seven-day checks")
        XCTAssertNil(home(interrupted: true))
        XCTAssertNil(home(remindersPending: true))
        XCTAssertEqual(home(cooled: false), .pro)
    }
}
