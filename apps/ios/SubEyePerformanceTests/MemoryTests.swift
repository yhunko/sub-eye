import XCTest

@MainActor
final class MemoryTests: XCTestCase {
    func testDetailOpenCloseCycles() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--test-store", "2D8AB337-F4A9-482D-9011-A71D3C437C22", "--fixture-count", "1000", "-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Subscriptions"].waitForExistence(timeout: 15)); app.tabBars.buttons["Subscriptions"].tap()
        let row = app.buttons["subscription-fixture-0"]
        XCTAssertTrue(row.waitForExistence(timeout: 15))
        print("MEMGRAPH BASELINE READY")
        // These pauses keep the app alive for the external memgraph collector.
        Thread.sleep(forTimeInterval: 20)
        for _ in 0..<10 {
            row.tap()
            XCTAssertTrue(app.buttons["subscriptionActions"].waitForExistence(timeout: 10))
            app.navigationBars.buttons.element(boundBy: 0).tap()
            XCTAssertTrue(row.waitForExistence(timeout: 10))
        }
        print("MEMGRAPH AFTER CYCLES READY")
        Thread.sleep(forTimeInterval: 20)
    }
}
