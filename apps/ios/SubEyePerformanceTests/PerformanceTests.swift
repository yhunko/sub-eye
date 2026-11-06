import XCTest

@MainActor
final class PerformanceTests: XCTestCase {
    private func application() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--test-store", "2D8AB337-F4A9-482D-9011-A71D3C437C22", "--fixture-count", "1000", "-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        return app
    }

    func testCachedProcessLaunch() {
        let app = application()
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Subscriptions"].waitForExistence(timeout: 15))
        app.tabBars.buttons["Subscriptions"].tap()
        XCTAssertTrue(app.buttons["subscription-fixture-0"].waitForExistence(timeout: 15))
        app.terminate()
        let options = XCTMeasureOptions(); options.iterationCount = 5
        measure(metrics: [XCTApplicationLaunchMetric(), XCTApplicationLaunchMetric(waitUntilResponsive: true)], options: options) {
            app.launch()
            XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10))
            app.terminate()
        }
    }

    func testScrollThousandSubscriptions() {
        let app = application(); app.launch()
        XCTAssertTrue(app.tabBars.buttons["Subscriptions"].waitForExistence(timeout: 15))
        app.tabBars.buttons["Subscriptions"].tap()
        XCTAssertTrue(app.buttons["subscription-fixture-0"].waitForExistence(timeout: 15))
        let options = XCTMeasureOptions(); options.iterationCount = 5
        measure(metrics: [XCTOSSignpostMetric.scrollingAndDecelerationMetric, XCTMemoryMetric(application: app), XCTCPUMetric(application: app)], options: options) {
            for _ in 0..<5 { app.swipeUp(velocity: .fast) }
            for _ in 0..<5 { app.swipeDown(velocity: .fast) }
        }
    }
}
