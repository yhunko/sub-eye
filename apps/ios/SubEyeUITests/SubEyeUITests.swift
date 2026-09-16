import XCTest

@MainActor
final class SubEyeUITests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    func testCurrencyCategoryNavigationAndYear() {
        let app = application(count: 12); app.launchArguments.append("--fixture-pro"); app.launch()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10))
        app.buttons["addSubscription"].firstMatch.tap(); app.buttons["nextSubscriptionStep"].tap()
        app.buttons["billingCycle"].tap(); app.buttons["Custom"].tap()
        XCTAssertTrue(app.pickerWheels.firstMatch.waitForExistence(timeout: 5))
        capture(app, name: "Recurrence-custom")
        app.buttons["billingCycle"].tap(); app.buttons["Quarterly"].tap()
        XCTAssertTrue(app.pickerWheels.firstMatch.waitForNonExistence(timeout: 5))
        XCTAssertTrue(app.buttons["billingCycle"].label.contains("Quarterly"))
        app.buttons["currencyPicker"].tap()
        XCTAssertTrue(app.buttons["currency-usd"].firstMatch.waitForExistence(timeout: 5))
        capture(app, name: "Currency")
        app.searchFields.firstMatch.tap(); app.searchFields.firstMatch.typeText("EUR")
        app.buttons["currency-eur"].firstMatch.tap()
        XCTAssertTrue(app.buttons["currencyPicker"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["currencyPicker"].label.contains("EUR"))
        app.buttons["categoryPicker"].tap()
        XCTAssertTrue(app.buttons["createCategory"].waitForExistence(timeout: 5))
        capture(app, name: "Categories")
        app.buttons["createCategory"].tap()
        let name = app.textFields["categoryName"]
        XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap(); name.typeText("Native category")
        capture(app, name: "Category-create")
        app.buttons["saveCategory"].tap()
        XCTAssertTrue(app.buttons["categoryPicker"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["categoryPicker"].label.contains("Native category"))
        app.buttons["Cancel"].firstMatch.tap()
        app.buttons["Discard changes"].firstMatch.tap()
        XCTAssertTrue(app.buttons["nextSubscriptionStep"].waitForNonExistence(timeout: 5))
        app.terminate(); app.launch()
        XCTAssertTrue(app.tabBars.buttons["Calendar"].waitForExistence(timeout: 10))
        app.tabBars.buttons["Calendar"].tap()
        XCTAssertTrue(app.buttons["Year"].waitForExistence(timeout: 5)); app.buttons["Year"].tap()
        let january = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'January,'")).firstMatch
        XCTAssertTrue(january.waitForExistence(timeout: 5)); capture(app, name: "Year")
        january.tap(); XCTAssertTrue(app.buttons["Next month"].waitForExistence(timeout: 5))
    }
    func testSingleCalendarSubscriptionOpensDirectly() {
        let app = application(count: 1); app.launch()
        XCTAssertTrue(app.tabBars.buttons["Calendar"].waitForExistence(timeout: 10)); app.tabBars.buttons["Calendar"].tap()
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.timeZone = TimeZone(secondsFromGMT: 0); formatter.dateFormat = "yyyy-MM-dd"
        let day = app.buttons["calendar-day-" + formatter.string(from: Date())]
        XCTAssertTrue(day.waitForExistence(timeout: 10)); day.tap()
        XCTAssertTrue(app.buttons["subscriptionActions"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["subscriptionDetailName"].label, "Netflix 0")
    }
    func testScreenCompositionAndAddSteps() {
        let app = application(count: 12); app.launch()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10))
        capture(app, name: "Home")
        app.tabBars.buttons["Subscriptions"].tap()
        XCTAssertTrue(app.buttons["subscription-fixture-0"].waitForExistence(timeout: 5))
        capture(app, name: "Subscriptions")
        app.buttons["subscription-fixture-0"].tap()
        XCTAssertTrue(app.buttons["subscriptionActions"].waitForExistence(timeout: 5))
        capture(app, name: "Detail")
        app.buttons["subscriptionActions"].tap(); app.buttons["editSubscription"].tap()
        XCTAssertTrue(app.textFields["subscriptionName"].waitForExistence(timeout: 5))
        capture(app, name: "Edit")
        app.buttons["Cancel"].firstMatch.tap()
        app.tabBars.buttons["Calendar"].tap()
        XCTAssertTrue(app.buttons["Next month"].waitForExistence(timeout: 5))
        capture(app, name: "Calendar")
        app.buttons["Year"].tap()
        XCTAssertTrue(app.buttons["Restore purchases"].waitForExistence(timeout: 5))
        capture(app, name: "Paywall")
        app.buttons["Cancel"].firstMatch.tap()
        app.tabBars.buttons["Settings"].tap()
        XCTAssertTrue(app.buttons["notificationSettings"].waitForExistence(timeout: 5))
        capture(app, name: "Settings")
        app.buttons["notificationSettings"].tap()
        capture(app, name: "Reminders")
        app.tabBars.buttons["Home"].tap()
        app.buttons["addSubscription"].firstMatch.tap()
        XCTAssertTrue(app.buttons["nextSubscriptionStep"].waitForExistence(timeout: 5))
        capture(app, name: "Add-brand")
        app.buttons["nextSubscriptionStep"].tap()
        XCTAssertTrue(app.textFields["subscriptionName"].waitForExistence(timeout: 5))
        capture(app, name: "Add-price")
    }
    func testMultipleCalendarSubscriptionsOpenDayList() {
        let app = application(count: 29); app.launch()
        XCTAssertTrue(app.tabBars.buttons["Calendar"].waitForExistence(timeout: 10)); app.tabBars.buttons["Calendar"].tap()
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.timeZone = TimeZone(secondsFromGMT: 0); formatter.dateFormat = "yyyy-MM-dd"
        let day = app.buttons["calendar-day-" + formatter.string(from: Date())]
        XCTAssertTrue(day.waitForExistence(timeout: 10)); day.tap()
        XCTAssertTrue(app.buttons["due-fixture-0"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["due-fixture-28"].exists)
        XCTAssertFalse(app.buttons["subscriptionActions"].exists)
        app.buttons["due-fixture-28"].tap()
        XCTAssertTrue(app.buttons["subscriptionActions"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["subscriptionDetailName"].label, "Adobe Creative Cloud 28")
    }
    private func capture(_ app: XCUIApplication, name: String) {
        let image = XCTAttachment(screenshot: app.screenshot()); image.name = name; image.lifetime = .keepAlways; add(image)
    }
    func testCreateEditSearchCalendarSettingsAndDelete() {
        let app = application(); app.launch()
        let add = app.buttons["addSubscription"].firstMatch
        XCTAssertTrue(add.waitForExistence(timeout: 10)); add.tap()
        app.buttons["nextSubscriptionStep"].tap()
        let name = app.textFields["subscriptionName"]
        XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap(); name.typeText("Native Flow Test")
        let price = app.textFields["subscriptionPrice"]; price.tap(); price.typeText("12.99")
        app.buttons["nextSubscriptionStep"].tap()
        app.buttons["saveSubscription"].tap()
        XCTAssertTrue(app.tabBars.buttons["Subscriptions"].waitForExistence(timeout: 5)); app.tabBars.buttons["Subscriptions"].tap()
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 5)); search.tap(); search.typeText("Native Flow")
        let record = app.staticTexts["Native Flow Test"].firstMatch
        XCTAssertTrue(record.waitForExistence(timeout: 5)); record.tap()
        app.buttons["subscriptionActions"].tap(); app.buttons["editSubscription"].tap()
        XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap()
        name.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: "Native Flow Test".count) + "Native Edited")
        app.buttons["saveSubscription"].tap()
        XCTAssertTrue(app.staticTexts["subscriptionDetailName"].waitForExistence(timeout: 5))
        app.tabBars.buttons["Calendar"].tap()
        XCTAssertTrue(app.buttons["Next month"].waitForExistence(timeout: 5))
        app.tabBars.buttons["Settings"].tap(); app.buttons["notificationSettings"].tap()
        let live = app.switches["liveActivitiesToggle"]
        if !live.isHittable { app.swipeUp() }
        XCTAssertTrue(live.waitForExistence(timeout: 5)); XCTAssertEqual(live.value as? String, "0")
        app.tabBars.buttons["Subscriptions"].tap()
        app.buttons["subscriptionActions"].tap()
        app.buttons["Delete"].tap(); app.buttons["Confirm"].tap()
        XCTAssertTrue(app.searchFields.firstMatch.waitForExistence(timeout: 5))
    }
    func testUkrainianCalendarSettingsAndLongNames() {
        let app = application(language: "uk", count: 12); app.launch()
        XCTAssertTrue(app.tabBars.buttons["Підписки"].waitForExistence(timeout: 10)); app.tabBars.buttons["Підписки"].tap()
        let search = app.searchFields.firstMatch; XCTAssertTrue(search.waitForExistence(timeout: 5)); search.tap(); search.typeText("Дуже довга")
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "Дуже довга назва")).firstMatch.waitForExistence(timeout: 5))
        let cancelSearch = app.buttons.matching(NSPredicate(format: "label IN %@", ["Закрити", "Скасувати"])).firstMatch
        XCTAssertTrue(cancelSearch.waitForExistence(timeout: 5)); cancelSearch.tap()
        app.tabBars.buttons["Календар"].tap(); XCTAssertTrue(app.buttons["Наступний місяць"].waitForExistence(timeout: 5))
        app.tabBars.buttons["Налаштування"].tap(); XCTAssertTrue(app.buttons["notificationSettings"].waitForExistence(timeout: 5))
    }
    func testOfflineWarmLaunchRetainsLocalSubscriptions() {
        let app = application(count: 80); app.launch()
        XCTAssertTrue(app.tabBars.buttons["Subscriptions"].waitForExistence(timeout: 10)); app.tabBars.buttons["Subscriptions"].tap()
        XCTAssertTrue(app.staticTexts["Netflix 0"].waitForExistence(timeout: 10))
        app.terminate(); app.launch()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 5)); app.tabBars.buttons["Subscriptions"].tap()
        XCTAssertTrue(app.staticTexts["Netflix 0"].waitForExistence(timeout: 5))
    }
    func testLargestUkrainianTextAndAccessibility() throws {
        let app = application(language: "uk", count: 12)
        app.launchArguments.append("--largest-text")
        app.launch()
        XCTAssertTrue(app.tabBars.buttons["Підписки"].waitForExistence(timeout: 10)); app.tabBars.buttons["Підписки"].tap()
        if #available(iOS 17, *) { try auditVisibleContent(app) }
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 5)); search.tap(); search.typeText("Дуже довга")
        let record = app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "Дуже довга назва")).firstMatch
        XCTAssertTrue(record.waitForExistence(timeout: 5)); record.tap()
        XCTAssertTrue(app.buttons["subscriptionActions"].waitForExistence(timeout: 5))
        let attachment = XCTAttachment(screenshot: app.screenshot()); attachment.lifetime = .keepAlways; add(attachment)
        if #available(iOS 17, *) { try auditVisibleContent(app) }
        app.swipeUp()
        if #available(iOS 17, *) { try auditVisibleContent(app) }
    }
    @available(iOS 17, *)
    private func auditVisibleContent(_ app: XCUIApplication) throws {
        try app.performAccessibilityAudit(for: [.textClipped, .hitRegion, .contrast, .sufficientElementDescription]) { issue in
            // iOS audits scrolling text behind the status, navigation and tab glass.
            // Visible content, bar labels and other audit types stay checked.
            guard issue.auditType == .contrast, let element = issue.element, element.elementType != .button else { return false }
            guard app.frame.intersects(element.frame) else { return true }
            let bars = [app.tabBars.firstMatch, app.navigationBars.firstMatch].filter(\.exists)
            let labels = bars.flatMap { $0.buttons.allElementsBoundByIndex + $0.staticTexts.allElementsBoundByIndex }.map(\.label)
            guard !labels.contains(element.label) else { return false }
            let status = CGRect(x: app.frame.minX, y: app.frame.minY, width: app.frame.width, height: max(0, app.navigationBars.firstMatch.frame.minY - app.frame.minY))
            return element.frame.intersects(status) || bars.contains { element.frame.intersects($0.frame) }
        }
    }
    private func application(language: String = "en", count: Int = 0) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--test-store", UUID().uuidString, "--fixture-count", String(count), "-AppleLanguages", "(" + language + ")", "-AppleLocale", language == "uk" ? "uk_UA" : "en_US"]
        return app
    }
}
