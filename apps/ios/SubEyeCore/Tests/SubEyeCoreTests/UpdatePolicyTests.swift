import XCTest
@testable import SubEyeCore

final class UpdatePolicyTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_800_000_000)
    private func release(_ version: String = "6.1.0", age: TimeInterval = 4 * 86_400, minimumOS: String = "16.4") -> StoreRelease {
        StoreRelease(version: version, releasedAt: now.addingTimeInterval(-age), minimumOS: minimumOS)
    }
    private func available(_ release: StoreRelease, installed: String = "6.0.0", system: String = "26.0", firstSession: Bool = false) -> Bool {
        UpdatePolicy.available(release, installed: installed, system: system, now: now, firstSession: firstSession)
    }

    func testVersionsCompareNumericallyPerComponent() {
        XCTAssertTrue(UpdatePolicy.isNewer("6.10", than: "6.9"), "string comparison would rank 6.10 below 6.9")
        XCTAssertTrue(UpdatePolicy.isNewer("6.0.1", than: "6.0"))
        XCTAssertTrue(UpdatePolicy.isNewer("7", than: "6.9.9"))
        XCTAssertFalse(UpdatePolicy.isNewer("6.0", than: "6.0.0"), "a missing component is zero, not older")
        XCTAssertFalse(UpdatePolicy.isNewer("6.0.0", than: "6.0.0"))
        XCTAssertFalse(UpdatePolicy.isNewer("5.9", than: "6.0.0"), "a rolled-back store version must not offer a downgrade")
        XCTAssertFalse(UpdatePolicy.isNewer("6.1b", than: "6.0.0"), "an unparseable version never offers an update")
        XCTAssertFalse(UpdatePolicy.isNewer("", than: "6.0.0"))
        XCTAssertFalse(available(release("6.0.0")))
    }

    func testSystemMustMeetMinimumOS() {
        XCTAssertFalse(available(release(minimumOS: "17.0"), system: "16.4.1"), "offering an update the device cannot install is a dead end")
        XCTAssertTrue(available(release(minimumOS: "17.0"), system: "17.0.1"))
        XCTAssertTrue(available(release(minimumOS: "26"), system: "26.0"))
        XCTAssertFalse(available(release(minimumOS: "unknown"), system: "26.0"))
    }

    func testReleaseWaitsThreeDays() {
        XCTAssertFalse(available(release(age: 3 * 86_400 - 1)), "auto-update users receive it silently inside the grace period")
        XCTAssertTrue(available(release(age: 3 * 86_400)))
        XCTAssertFalse(available(release(age: -60)), "a release date in the future is not live")
    }

    func testDismissalHidesOnlyThatVersion() {
        let current = release("6.1.0")
        XCTAssertFalse(UpdatePolicy.banner(current, installed: "6.0.0", system: "26.0", now: now, firstSession: false, dismissed: "6.1.0"))
        XCTAssertTrue(available(current), "Settings keeps offering a dismissed update")
        XCTAssertTrue(UpdatePolicy.banner(release("6.2.0"), installed: "6.0.0", system: "26.0", now: now, firstSession: false, dismissed: "6.1.0"))
        XCTAssertTrue(UpdatePolicy.banner(current, installed: "6.0.0", system: "26.0", now: now, firstSession: false, dismissed: nil))
    }

    func testFirstSessionAfterInstallShowsNothing() {
        XCTAssertFalse(available(release(), firstSession: true), "a fresh install from an old link must not open on an update nag")
        XCTAssertFalse(UpdatePolicy.banner(release(), installed: "6.0.0", system: "26.0", now: now, firstSession: true, dismissed: nil))
        XCTAssertFalse(UpdatePolicy.available(nil, installed: "6.0.0", system: "26.0", now: now, firstSession: false))
    }

    func testLookupRunsAtMostDaily() {
        XCTAssertTrue(UpdatePolicy.isDue(nil, now: now))
        XCTAssertFalse(UpdatePolicy.isDue(UpdateCheck(checkedAt: now.addingTimeInterval(-86_399), release: nil), now: now))
        XCTAssertTrue(UpdatePolicy.isDue(UpdateCheck(checkedAt: now.addingTimeInterval(-86_400), release: nil), now: now))
        XCTAssertTrue(UpdatePolicy.isDue(UpdateCheck(checkedAt: now.addingTimeInterval(3600), release: nil), now: now), "a clock moved backwards must not silence checks until it catches up")
    }

    func testLookupKeepsFirstNonEmptyReleaseNotesLine() throws {
        let body = #"{"resultCount":1,"results":[{"version":"6.1.0","currentVersionReleaseDate":"2026-10-12T07:00:00Z","minimumOsVersion":"16.4","releaseNotes":"\n  \n• Savings ledger on Home\nBug fixes"}]}"#
        let parsed = try XCTUnwrap(StoreRelease(lookup: Data(body.utf8)))
        XCTAssertEqual(parsed.version, "6.1.0")
        XCTAssertEqual(parsed.minimumOS, "16.4")
        XCTAssertEqual(parsed.releasedAt, Date(timeIntervalSince1970: 1_791_788_400))
        XCTAssertEqual(parsed.notes, "• Savings ledger on Home")
        let silent = #"{"results":[{"version":"6.1.0","currentVersionReleaseDate":"2026-10-12T07:00:00Z","minimumOsVersion":"16.4"}]}"#
        XCTAssertNil(try XCTUnwrap(StoreRelease(lookup: Data(silent.utf8))).notes)
        XCTAssertNil(StoreRelease(lookup: Data(#"{"resultCount":0,"results":[]}"#.utf8)), "the app is not sold in that storefront")
        XCTAssertNil(StoreRelease(lookup: Data(#"{"results":[{"version":"6.1.0"}]}"#.utf8)))
    }
}
