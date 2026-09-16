import XCTest

@MainActor
final class DeviceAcceptanceTests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }

    private static func removeTemporaryRecord(named name: String) {
        let app = application(); app.launch()
        let tab = app.tabBars.buttons["rectangle.stack"]
        guard tab.waitForExistence(timeout: 10) else { XCTFail("The app did not reach its subscription tab for cleanup"); return }
        tab.tap()
        let search = app.searchFields.firstMatch
        guard search.waitForExistence(timeout: 5) else { XCTFail("Subscription search was unavailable for cleanup"); return }
        search.tap(); search.typeText(name)
        let record = app.staticTexts[name].firstMatch
        if record.waitForExistence(timeout: 10) {
            record.tap(); app.buttons["subscriptionActions"].tap()
            app.buttons["deleteSubscription"].tap(); app.buttons["confirmAction"].tap()
            XCTAssertTrue(app.buttons["subscriptionActions"].waitForNonExistence(timeout: 10))
            XCTAssertTrue(search.waitForExistence(timeout: 10))
            XCTAssertFalse(app.staticTexts[name].exists)
        }
        app.terminate()
    }

    private static func application() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        return app
    }

    func testVisualScreensOnExistingData() {
        let app = Self.application(); app.launch()
        XCTAssertTrue(app.tabBars.buttons["rectangle.stack"].waitForExistence(timeout: 10))
        app.tabBars.buttons["rectangle.stack"].tap()
        let row = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'subscription-' ")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 10))
        capture(app, name: "Device-subscriptions")
        row.tap()
        XCTAssertTrue(app.buttons["subscriptionActions"].waitForExistence(timeout: 5))
        capture(app, name: "Device-detail")
        app.tabBars.buttons["house"].tap(); capture(app, name: "Device-home")
        app.tabBars.buttons["gearshape"].tap()
        app.buttons["settingsCurrency"].tap()
        XCTAssertTrue(app.searchFields.firstMatch.waitForExistence(timeout: 5))
        capture(app, name: "Device-currency")
        XCUIDevice.shared.press(.home)
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.01))
            .press(forDuration: 0.1, thenDragTo: springboard.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.8)))
        _ = springboard.buttons.matching(NSPredicate(format: "identifier == 'keepRenewal' OR label IN %@", ["Keep", "Залишити"])).firstMatch.waitForExistence(timeout: 8)
        let lockScreen = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        lockScreen.name = "Device-live-activity"; lockScreen.lifetime = .keepAlways; add(lockScreen)
        let hierarchy = XCTAttachment(string: springboard.debugDescription)
        hierarchy.name = "Device-live-activity-hierarchy"; hierarchy.lifetime = .keepAlways; add(hierarchy)
        app.activate()
    }

    private func capture(_ app: XCUIApplication, name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }

    func testExistingSubscriptionsAndTemporaryRecordCRUD() throws {
        let app = Self.application(); app.launch()
        XCTAssertTrue(app.tabBars.buttons["Subscriptions"].waitForExistence(timeout: 15))
        app.tabBars.buttons["Subscriptions"].tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'subscription-'")).firstMatch.waitForExistence(timeout: 10))
        let name = "Native Device Check " + String(UUID().uuidString.prefix(6))
        addTeardownBlock { @MainActor in Self.removeTemporaryRecord(named: name) }
        app.buttons["addSubscription"].firstMatch.tap()
        app.buttons["nextSubscriptionStep"].tap()
        let field = app.textFields["subscriptionName"]
        XCTAssertTrue(field.waitForExistence(timeout: 5)); field.tap(); field.typeText(name)
        let price = app.textFields["subscriptionPrice"]; price.tap(); price.typeText("1.23")
        app.buttons["nextSubscriptionStep"].tap()
        app.buttons["saveSubscription"].tap()
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 10)); search.tap(); search.typeText(name)
        let record = app.staticTexts[name].firstMatch
        XCTAssertTrue(record.waitForExistence(timeout: 10)); record.tap()
        app.buttons["subscriptionActions"].tap(); app.buttons["editSubscription"].tap()
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        price.coordinate(withNormalizedOffset: CGVector(dx: 0.99, dy: 0.5)).tap()
        price.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: (price.value as? String ?? "").count) + "2.34")
        XCTAssertEqual(price.value as? String, "2.34")
        app.buttons["saveSubscription"].tap()
        XCTAssertTrue(price.waitForNonExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["subscriptionDetailName"].waitForExistence(timeout: 10))
        app.buttons["subscriptionActions"].tap()
        app.buttons["Delete"].tap(); app.buttons["Confirm"].tap()
        XCTAssertTrue(search.waitForExistence(timeout: 10))
        XCTAssertFalse(app.staticTexts[name].exists)
        app.tabBars.buttons["Calendar"].tap()
        XCTAssertTrue(app.buttons["Next month"].waitForExistence(timeout: 5))
        app.tabBars.buttons["Settings"].tap()
        XCTAssertTrue(app.buttons["notificationSettings"].waitForExistence(timeout: 5)); app.buttons["notificationSettings"].tap()
        let live = app.switches["liveActivitiesToggle"]
        for _ in 0..<4 where !live.isHittable { app.swipeUp() }
        XCTAssertTrue(live.exists)
        let screenshot = XCTAttachment(screenshot: app.screenshot()); screenshot.lifetime = .keepAlways; add(screenshot)
    }

    func testCachedPhysicalProcessLaunch() {
        let app = Self.application(); app.launch()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 15)); app.terminate()
        let options = XCTMeasureOptions(); options.iterationCount = 5
        measure(metrics: [XCTApplicationLaunchMetric(), XCTApplicationLaunchMetric(waitUntilResponsive: true)], options: options) {
            app.launch()
            XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10)); app.terminate()
        }
    }

    func testWarmPhysicalForegroundResume() {
        let app = Self.application(); app.launch()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 15))
        let options = XCTMeasureOptions(); options.iterationCount = 5; options.invocationOptions = [.manuallyStart, .manuallyStop]
        measure(metrics: [XCTClockMetric()], options: options) {
            XCUIDevice.shared.press(.home)
            startMeasuring()
            app.activate()
            XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10))
            stopMeasuring()
        }
    }
}
