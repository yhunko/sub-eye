import XCTest

@MainActor
final class SubEyeUITests: XCTestCase {
    override func setUpWithError() throws { continueAfterFailure = false }
    func testRevisedMenusCalendarAndEditor() { revisedInteractions(language: "en") }
    func testRevisedUkrainianLayouts() { revisedInteractions(language: "uk") }
    private func revisedInteractions(language: String) {
        let app = application(language: language, count: 12)
        app.launchArguments.append("--fixture-pro"); app.launch()
        let uk = language == "uk"
        let subscriptions = app.tabBars.buttons[uk ? "Підписки" : "Subscriptions"]
        XCTAssertTrue(subscriptions.waitForExistence(timeout: 10)); subscriptions.tap()
        app.buttons["subscriptionFilters"].tap()
        XCTAssertTrue(app.buttons["filterSort"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons[uk ? "Призупинено" : "Paused"].exists)
        capture(app, name: language + "-Filters-collapsed")
        app.buttons["filterStatus"].tap()
        capture(app, name: language + "-Filters-expanded")
        app.buttons[uk ? "Активна" : "Active"].tap()
        XCTAssertTrue(app.buttons["filterSort"].waitForNonExistence(timeout: 5))
        app.buttons["subscription-fixture-0"].tap()
        XCTAssertTrue(app.buttons["subscriptionActions"].waitForExistence(timeout: 5))
        app.buttons["subscriptionActions"].tap(); capture(app, name: language + "-Detail-menu")
        XCTAssertTrue(app.buttons["deleteSubscription"].waitForExistence(timeout: 5))
        app.buttons["deleteSubscription"].tap()
        XCTAssertTrue(app.alerts.firstMatch.waitForExistence(timeout: 5)); capture(app, name: language + "-Delete-confirmation")
        app.buttons["cancelDeletion"].firstMatch.tap()
        XCTAssertTrue(app.staticTexts["subscriptionDetailName"].exists)
        app.tabBars.buttons[uk ? "Календар" : "Calendar"].tap()
        XCTAssertTrue(app.buttons["calendarToday"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["calendarToday"].isSelected)
        let title = app.navigationBars.firstMatch.identifier
        let pager = app.descendants(matching: .any)["calendarPager"].firstMatch
        XCTAssertTrue(pager.waitForExistence(timeout: 5)); pager.swipeLeft()
        XCTAssertTrue(app.navigationBars.matching(NSPredicate(format: "identifier != %@", title)).firstMatch.waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["calendarToday"].isSelected)
        capture(app, name: language + "-Calendar-next")
        pager.swipeRight()
        XCTAssertTrue(app.navigationBars[title].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["calendarToday"].isSelected)
        app.buttons[uk ? "Наступний місяць" : "Next month"].tap()
        app.buttons[uk ? "Сьогодні" : "Today"].tap()
        XCTAssertTrue(app.navigationBars[title].waitForExistence(timeout: 5))
        capture(app, name: language + "-Calendar-current")
        app.tabBars.buttons[uk ? "Параметри" : "Settings"].tap()
        app.buttons["settingsCurrency"].tap()
        XCTAssertTrue(app.searchFields.firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.tabBars.firstMatch.waitForNonExistence(timeout: 5))
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["settingsCurrency"].exists)
        capture(app, name: language + "-Settings")
        XCTAssertFalse(app.buttons["settingsTimezone"].exists)
        app.tabBars.buttons[uk ? "Головна" : "Home"].tap()
        startSubscription(app)
        XCTAssertTrue(app.buttons["nextSubscriptionStep"].waitForExistence(timeout: 5))
        capture(app, name: language + "-Add-subscription-brand")
        app.buttons["nextSubscriptionStep"].tap()
        let name = app.textFields["subscriptionName"]
        // Return moves focus without a coordinate tap: the first keyboard can finish presenting after typing ends,
        // and its keyboardDidShow reveal scrolls the price field while XCUITest is computing its hit point.
        XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap(); name.typeText("Draft survives back\n")
        let price = app.textFields["subscriptionPrice"]; price.typeText("1")
        XCTAssertGreaterThan(app.buttons["currencyPicker"].frame.minX, price.frame.maxX)
        app.buttons["dismissEditorKeyboard"].tap()
        // Pro gives the card the toggle trait, which XCUITest reports as a switch, not a button.
        let intro = app.descendants(matching: .any)["introOffer"].firstMatch
        for _ in 0..<4 where !intro.isHittable { app.swipeUp() }
        intro.tap()
        XCTAssertTrue(app.textFields["offerPrice"].waitForExistence(timeout: 5))
        capture(app, name: language + "-Add-subscription-terms")
        app.swipeUp(); capture(app, name: language + "-Add-subscription-terms-bottom")
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.buttons["nextSubscriptionStep"].waitForExistence(timeout: 5))
        app.buttons["nextSubscriptionStep"].tap()
        XCTAssertTrue(name.waitForExistence(timeout: 5)); XCTAssertEqual(name.value as? String, "Draft survives back")
        for _ in 0..<4 where !intro.isHittable { app.swipeUp() }
        XCTAssertTrue(app.textFields["offerPrice"].exists, "The lower start survives going back to the brand step")
        let brand = app.buttons["subscriptionBrand"]
        for _ in 0..<4 where !brand.isHittable { app.swipeDown() }
        brand.tap()
        XCTAssertTrue(app.searchFields.firstMatch.waitForExistence(timeout: 5))
        capture(app, name: language + "-Brand-picker")
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(name.waitForExistence(timeout: 5))
        app.buttons["closeSubscriptionEditor"].tap()
        XCTAssertFalse(app.alerts.firstMatch.exists)
        capture(app, name: language + "-Discard-menu")
        app.buttons[uk ? "Скасувати зміни" : "Discard changes"].tap()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 5))
    }
    func testCurrencyCategoryNavigationAndYear() {
        let app = application(count: 12); app.launchArguments.append("--fixture-pro"); app.launch()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10))
        startSubscription(app); app.buttons["nextSubscriptionStep"].tap()
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
        XCTAssertTrue(app.buttons["saveSubscription"].waitForNonExistence(timeout: 5))
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
        startSubscription(app)
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
        XCTAssertTrue(add.waitForExistence(timeout: 10)); app.buttons["emptyNewSubscription"].tap()
        app.buttons["nextSubscriptionStep"].tap()
        let name = app.textFields["subscriptionName"]
        XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap(); name.typeText("Native Flow Test\n")
        let price = app.textFields["subscriptionPrice"]; price.typeText("12.99")
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
        app.buttons["deleteSubscription"].tap(); app.buttons["confirmAction"].firstMatch.tap()
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
        app.tabBars.buttons["Параметри"].tap(); XCTAssertTrue(app.buttons["notificationSettings"].waitForExistence(timeout: 5))
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
            // UIKit keeps the search field's own height at accessibility sizes, so its placeholder is clipped by the system.
            // A currency flag (regional-indicator letters only) reports clipping because the emoji outgrows its line box; it is drawn whole.
            if issue.auditType == .textClipped, let element = issue.element, element.elementType == .searchField
                || !element.label.isEmpty && element.label.unicodeScalars.allSatisfy({ (0x1F1E6...0x1F1FF).contains($0.value) }) { return true }
            guard issue.auditType == .contrast, let element = issue.element, element.elementType != .button else { return false }
            guard app.frame.intersects(element.frame) else { return true }
            let bars = [app.tabBars.firstMatch, app.navigationBars.firstMatch].filter(\.exists)
            let labels = bars.flatMap { $0.buttons.allElementsBoundByIndex + $0.staticTexts.allElementsBoundByIndex }.map(\.label)
            guard !labels.contains(element.label) else { return false }
            let status = CGRect(x: app.frame.minX, y: app.frame.minY, width: app.frame.width, height: max(0, app.navigationBars.firstMatch.frame.minY - app.frame.minY))
            // The soft scroll edge starts fading content about 37 pt above the tab bar's own frame.
            let glass = bars.map { $0.elementType == .tabBar ? $0.frame.insetBy(dx: 0, dy: -40) : $0.frame }
            return element.frame.intersects(status) || glass.contains { element.frame.intersects($0) }
        }
    }
    func testClearLifecycleAndPricingSheets() { clearSheets(language: "en") }
    func testClearUkrainianSheetsAtLargestText() { clearSheets(language: "uk", largest: true) }

    private func clearSheets(language: String, largest: Bool = false) {
        let app = application(language: language, count: 12)
        app.launchArguments.append("--fixture-pro")
        app.launchArguments.append("--fixture-brands")
        if largest { app.launchArguments.append("--largest-text") }
        app.launch()
        let uk = language == "uk"
        let subscriptions = app.tabBars.buttons[uk ? "Підписки" : "Subscriptions"]
        XCTAssertTrue(subscriptions.waitForExistence(timeout: 10)); subscriptions.tap()
        app.buttons["subscription-fixture-1"].tap()
        app.buttons["subscriptionActions"].tap()
        app.buttons[uk ? "Скасувати підписку" : "Cancel subscription"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["providerWebsite"].firstMatch.waitForExistence(timeout: 5))
        capture(app, name: language + "-Provider-link")
        let renewal = app.buttons["cancelAtRenewal"]
        XCTAssertTrue(renewal.waitForExistence(timeout: 5)); XCTAssertTrue(renewal.isSelected)
        let immediate = app.buttons["cancelImmediately"]
        for _ in 0..<5 where !immediate.isHittable { app.swipeUp() }
        immediate.tap(); XCTAssertTrue(immediate.isSelected); XCTAssertFalse(renewal.isSelected)
        capture(app, name: language + "-Cancellation-clear-choices")
        app.buttons[uk ? "Скасувати" : "Cancel"].firstMatch.tap()
        app.buttons["subscriptionActions"].tap()
        app.buttons[uk ? "Керувати ціною" : "Manage pricing"].tap()
        let save = app.buttons["savePricing"]
        XCTAssertTrue(save.waitForExistence(timeout: 5)); XCTAssertFalse(save.isEnabled)
        capture(app, name: language + "-Pricing-clear-choices")
        let price = app.textFields["newPhasePrice"]
        for _ in 0..<5 where !price.isHittable { app.swipeUp() }
        price.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        XCTAssertLessThan(price.frame.maxY, app.keyboards.firstMatch.frame.minY)
        price.typeText("8.50")
        XCTAssertTrue(save.isEnabled)
        app.buttons["dismissPricingKeyboard"].tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 5))
        let custom = app.buttons["priceCustomDate"]
        for _ in 0..<6 where !custom.isHittable { app.swipeUp() }
        custom.tap(); XCTAssertTrue(custom.isSelected)
        XCTAssertTrue(app.datePickers.firstMatch.exists)
        for _ in 0..<8 where !app.buttons["temporaryPriceMode"].isHittable { app.swipeDown() }
        app.buttons["temporaryPriceMode"].tap()
        for _ in 0..<6 where !price.isHittable { app.swipeUp() }
        price.tap()
        XCTAssertTrue(app.buttons["nextPricingField"].waitForExistence(timeout: 5))
        app.buttons["nextPricingField"].tap()
        let standard = app.textFields["standardPhasePrice"]
        XCTAssertTrue(standard.isHittable)
        XCTAssertLessThan(standard.frame.maxY, app.keyboards.firstMatch.frame.minY)
        XCTAssertGreaterThan(standard.frame.minY, app.navigationBars.firstMatch.frame.maxY)
        capture(app, name: language + "-Keyboard-focused-standard-price")
        app.buttons["dismissPricingKeyboard"].tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 5))
        let next = app.buttons["offerNextPayment"]
        for _ in 0..<8 where !next.isHittable { app.swipeUp() }
        XCTAssertTrue(next.isSelected)
        capture(app, name: language + "-Offer-next-payment-default")
        save.tap()
        XCTAssertTrue(app.buttons["subscriptionActions"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.alerts.firstMatch.exists)
        XCTAssertTrue(app.staticTexts["₴6.00"].firstMatch.waitForExistence(timeout: 5), "A deferred offer must preserve the current price")
    }

    func testEditorKeyboardRevealsPriceAtLargestText() {
        let app = application(language: "uk")
        app.launchArguments.append("--largest-text"); app.launch()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10))
        app.buttons["emptyNewSubscription"].tap()
        app.buttons["nextSubscriptionStep"].tap()
        let name = app.textFields["subscriptionName"]
        XCTAssertTrue(name.waitForExistence(timeout: 5))
        name.tap()
        XCTAssertTrue(app.buttons["nextEditorField"].waitForExistence(timeout: 5))
        app.buttons["nextEditorField"].tap()
        let price = app.textFields["subscriptionPrice"]
        XCTAssertTrue(price.isHittable)
        XCTAssertLessThan(price.frame.maxY, app.keyboards.firstMatch.frame.minY)
        XCTAssertGreaterThan(price.frame.minY, app.navigationBars.firstMatch.frame.maxY)
        price.typeText("12")
        capture(app, name: "uk-Editor-keyboard-auto-scroll")
        app.buttons["dismissEditorKeyboard"].tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 5))
    }

    func testReminderOfferAfterCreationAndNoRepeatAfterDeclining() {
        reminderOfferFlow(swipeToDismiss: false, language: "uk")
    }

    func testReminderOfferSwipeFinishesSavedForm() {
        reminderOfferFlow(swipeToDismiss: true)
    }

    func testReminderOfferLargestTextBottomActions() {
        reminderOfferFlow(swipeToDismiss: false, language: "uk", largestText: true)
    }

    private func reminderOfferFlow(swipeToDismiss: Bool, language: String = "en", largestText: Bool = false) {
        let app = application(language: language)
        if largestText { app.launchArguments.append("--largest-text") }
        app.launchArguments.append("--test-reminder-prompt"); app.launch()
        func createSubscription(_ name: String) {
            XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10))
            startSubscription(app)
            app.buttons["nextSubscriptionStep"].tap()
            let nameField = app.textFields["subscriptionName"]
            XCTAssertTrue(nameField.waitForExistence(timeout: 5)); nameField.tap(); nameField.typeText(name)
            app.buttons["nextEditorField"].tap()
            app.textFields["subscriptionPrice"].typeText("4.99")
            app.buttons["dismissEditorKeyboard"].tap()
            let save = app.buttons["saveSubscription"]
            XCTAssertTrue(save.isHittable)
            XCTAssertGreaterThan(save.frame.midY, app.frame.height * 0.7, "Save belongs in the same bottom action area as Next")
            capture(app, name: "Editor-bottom-save")
            save.tap()
        }
        createSubscription("Reminder offer first")
        let title = app.staticTexts["reminderOfferTitle"]
        XCTAssertTrue(title.waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["enableReminderOffer"].isHittable)
        XCTAssertTrue(app.buttons["skipReminderOffer"].isHittable)
        capture(app, name: "Reminder-offer-over-saved-form")
        if swipeToDismiss {
            let top = title.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.1))
            top.press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.95)))
        } else {
            app.buttons["skipReminderOffer"].tap()
        }
        XCTAssertTrue(title.waitForNonExistence(timeout: 5))
        XCTAssertTrue(app.buttons["saveSubscription"].waitForNonExistence(timeout: 5), "Dismissing the offer must finish the saved form")
        createSubscription("Reminder offer second")
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10))
        let repeated = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true"), object: title)
        repeated.isInverted = true
        wait(for: [repeated], timeout: 2)
    }

    func testDeveloperScenariosDriveTheRealDetailScreen() {
        let app = application(); app.launchArguments.append("--fixture-pro"); app.launch()
        openDeveloperTools(app)
        let card = app.descendants(matching: .any)["pendingPriceCard"]
        let manage = app.buttons["managePendingPrice"]
        for (scenario, apply) in [("priceIncrease", true), ("priceDecrease", false)] {
            openScenario(scenario, in: app)
            XCTAssertTrue(card.waitForExistence(timeout: 5), scenario)
            manage.tap()
            let action = app.buttons[apply ? "applyPendingPrice" : "removePendingPrice"]
            XCTAssertTrue(action.waitForExistence(timeout: 5), scenario); action.tap()
            // iOS nests the action sheet button inside a container that repeats its identifier.
            let confirm = app.buttons["confirmPendingPrice"].firstMatch
            XCTAssertTrue(confirm.waitForExistence(timeout: 5), scenario); confirm.tap()
            XCTAssertTrue(card.waitForNonExistence(timeout: 5), scenario)
            back(app)
            openScenario(scenario, in: app)
            XCTAssertTrue(card.waitForExistence(timeout: 5), "Reopening \(scenario) must reset its fixture")
            back(app)
        }
        for scenario in ["priceIncreaseLater", "priceCurrency", "introEnding", "offerStarting"] {
            openScenario(scenario, in: app)
            XCTAssertTrue(card.waitForExistence(timeout: 5), scenario)
            XCTAssertTrue(manage.exists, scenario)
            back(app)
        }
        openScenario("trialEnding", in: app)
        XCTAssertTrue(card.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["cancelTrial"].exists)
        XCTAssertFalse(manage.exists)
        back(app)
        for scenario in ["licensePurchase", "licenseUpdates", "licenseRenewed"] {
            openScenario(scenario, in: app)
            XCTAssertTrue(card.waitForExistence(timeout: 5), scenario)
            XCTAssertFalse(manage.exists, "An optional updates renewal is not a pending price to apply or remove")
            back(app)
        }
        for scenario in ["active", "paused", "cancelling", "cancelled"] {
            openScenario(scenario, in: app)
            XCTAssertTrue(app.staticTexts["subscriptionDetailName"].waitForExistence(timeout: 5), scenario)
            XCTAssertFalse(card.exists, scenario)
            back(app)
        }
    }

    func testDeveloperPriceChangeIsReadOnlyOnFreePlan() {
        let app = application(); app.launch()
        openDeveloperTools(app)
        openScenario("priceIncrease", in: app)
        XCTAssertTrue(app.descendants(matching: .any)["pendingPriceCard"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["managePendingPrice"].exists)
        XCTAssertTrue(app.buttons["timelineLock"].exists)
    }

    func testDeveloperProOverrideAppliesToTheOpenScenario() {
        let app = application(); app.launch()
        openDeveloperTools(app)
        openScenario("priceIncrease", in: app)
        XCTAssertTrue(app.descendants(matching: .any)["pendingPriceCard"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["managePendingPrice"].exists)
        app.buttons["developerOverrides"].tap()
        let pro = app.buttons["overridePro"]
        XCTAssertTrue(pro.waitForExistence(timeout: 5)); pro.tap()
        XCTAssertTrue(app.buttons["managePendingPrice"].waitForExistence(timeout: 5))
    }

    func testRemindMeTurnsRemindersOnInPlace() {
        let app = application(); app.launch()
        openDeveloperTools(app)
        openScenario("priceIncrease", in: app)
        let remind = app.buttons["remindMe"]
        XCTAssertTrue(remind.waitForExistence(timeout: 5)); remind.tap()
        // Permission survives between runs on one simulator, so the system prompt shows only on the first,
        // and the checkmark stays for about a second, so both are polled rather than awaited in turn.
        let allow = XCUIApplication(bundleIdentifier: "com.apple.springboard").buttons["Allow"]
        let confirmation = app.buttons["reminderSet"]
        var confirmed = false
        let deadline = Date().addingTimeInterval(10)
        while !confirmed, Date() < deadline {
            if allow.exists { allow.tap() }
            confirmed = confirmation.exists
        }
        XCTAssertTrue(confirmed)
        XCTAssertTrue(confirmation.waitForNonExistence(timeout: 5))
        XCTAssertFalse(remind.exists)
    }

    func testDeveloperHomeSavingsOpensEndedSubscriptions() {
        let app = application(); app.launch()
        openDeveloperTools(app)
        openScenario("homeSavingsSeveral", in: app)
        let saved = app.buttons["savedWithSubEye"]
        XCTAssertTrue(saved.waitForExistence(timeout: 10))
        for _ in 0..<6 where !saved.isHittable { app.swipeUp() }
        saved.tap()
        XCTAssertTrue(app.buttons["subscription-developer-stopped-adobe"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["subscription-developer-cancelled"].exists)
    }

    func testAddInstallmentShowsTheSwitchUntilTheLastIsDeleted() { addAndDeleteInstallment(language: "en") }
    func testAddInstallmentInUkrainian() { addAndDeleteInstallment(language: "uk") }

    private func addAndDeleteInstallment(language: String) {
        let app = application(language: language, count: 1); app.launch()
        let uk = language == "uk"
        let subscriptions = app.tabBars.buttons[uk ? "Підписки" : "Subscriptions"]
        XCTAssertTrue(subscriptions.waitForExistence(timeout: 10)); subscriptions.tap()
        XCTAssertTrue(app.buttons["subscription-fixture-0"].waitForExistence(timeout: 5))
        let segment = app.segmentedControls["listSegment"]
        XCTAssertFalse(segment.exists, "The switch stays hidden until a plan exists")
        app.navigationBars.buttons["addSubscription"].firstMatch.tap()
        let item = app.buttons["newInstallment"].firstMatch
        XCTAssertTrue(item.waitForExistence(timeout: 5)); item.tap()
        let name = app.textFields["installmentName"]
        let title = uk ? "Ноутбук" : "Laptop"
        XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap(); name.typeText(title + "\n")
        app.textFields["installmentTotal"].typeText("1200")
        app.buttons["dismissEditorKeyboard"].tap()
        let count = app.textFields["installmentCount"]
        for _ in 0..<4 where !count.isHittable { app.swipeUp() }
        count.tap(); count.typeText("4")
        app.buttons["dismissEditorKeyboard"].tap()
        capture(app, name: language + "-Installment-editor")
        app.buttons["saveInstallment"].tap()
        XCTAssertTrue(segment.waitForExistence(timeout: 5), "Saving the first plan shows the switch")
        segment.buttons[uk ? "Розстрочки" : "Installments"].tap()
        XCTAssertFalse(app.buttons["subscriptionFilters"].exists, "Subscription filters do not apply to plans")
        let row = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'installment-'")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 5)); capture(app, name: language + "-Installments")
        row.tap()
        XCTAssertTrue(app.buttons["installmentActions"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["installmentDetailName"].label, title)
        app.buttons["installmentActions"].tap(); app.buttons["deleteInstallment"].tap()
        app.buttons["confirmAction"].firstMatch.tap()
        XCTAssertTrue(app.buttons["subscription-fixture-0"].waitForExistence(timeout: 5), "Deleting the last plan returns to Subscriptions")
        XCTAssertFalse(segment.exists)
    }

    func testHomeCardOpensTheInstallmentsList() {
        let app = application(count: 2); app.launchArguments += ["--fixture-installments", "4"]; app.launch()
        let card = app.buttons["homeInstallments"]
        XCTAssertTrue(card.waitForExistence(timeout: 10))
        for _ in 0..<6 where !card.isHittable { app.swipeUp() }
        capture(app, name: "Home-installments")
        card.tap()
        XCTAssertTrue(app.buttons["installment-fixture-installment-0"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["installment-fixture-installment-2"].exists, "Paid-off plans are listed too")
        let segment = app.segmentedControls["listSegment"]
        XCTAssertTrue(segment.buttons["Installments"].isSelected)
        segment.buttons["Subscriptions"].tap()
        XCTAssertTrue(app.buttons["subscription-fixture-0"].waitForExistence(timeout: 5))
    }

    func testLargestUkrainianTextWithInstallments() throws {
        let app = application(language: "uk", count: 3)
        app.launchArguments += ["--fixture-installments", "4", "--largest-text"]; app.launch()
        let card = app.buttons["homeInstallments"]
        XCTAssertTrue(card.waitForExistence(timeout: 10))
        for _ in 0..<8 where !card.isHittable { app.swipeUp() }
        capture(app, name: "uk-AX-Home-installments")
        if #available(iOS 17, *) { try auditVisibleContent(app) }
        card.tap()
        let segment = app.segmentedControls["listSegment"]
        XCTAssertTrue(app.buttons["installment-fixture-installment-0"].waitForExistence(timeout: 5))
        capture(app, name: "uk-AX-Installments")
        if #available(iOS 17, *) { try auditVisibleContent(app) }
        app.swipeUp()
        if #available(iOS 17, *) { try auditVisibleContent(app) }
        for _ in 0..<8 where !segment.isHittable { app.swipeDown() }
        segment.buttons["Підписки"].tap()
        XCTAssertTrue(app.buttons["subscription-fixture-0"].waitForExistence(timeout: 5))
        capture(app, name: "uk-AX-Subscriptions-segment")
        if #available(iOS 17, *) { try auditVisibleContent(app) }
        segment.buttons["Розстрочки"].tap()
        let long = app.buttons["installment-fixture-installment-3"]
        for _ in 0..<8 where !long.isHittable { app.swipeUp() }
        long.tap()
        XCTAssertTrue(app.buttons["installmentActions"].waitForExistence(timeout: 5))
        capture(app, name: "uk-AX-Installment-detail")
        if #available(iOS 17, *) { try auditVisibleContent(app) }
        app.swipeUp()
        if #available(iOS 17, *) { try auditVisibleContent(app) }
    }

    func testAddEachKindInEnglish() {
        let app = application(count: 1); app.launchArguments.append("--fixture-pro"); app.launch()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10))
        openAddMenu(app)
        XCTAssertFalse(menuText(app, "newTrial").contains("Pro"), "Pro sees no lock")
        XCTAssertFalse(menuText(app, "newLicense").contains("Pro"))
        capture(app, name: "en-Add-menu-pro")
        app.buttons["newSubscription"].firstMatch.tap()
        // Every date moves off its default, so a picker bound to the wrong state or a save reading a default shows on the detail.
        let first = Self.shift(Self.today, days: 2), introEnd = Self.shift(Self.today, days: 12)

        capture(app, name: "en-Add-subscription-brand")
        app.buttons["nextSubscriptionStep"].tap()
        type("Gym", "11.99", priceField: "subscriptionPrice", in: app)
        XCTAssertEqual(app.textFields["subscriptionPrice"].label, "Price")
        pick(first, for: "firstPayment", in: app)
        let intro = app.descendants(matching: .any)["introOffer"].firstMatch
        for _ in 0..<4 where !intro.isHittable { app.swipeUp() }
        intro.tap()
        let offer = app.textFields["offerPrice"]
        XCTAssertTrue(offer.waitForExistence(timeout: 5)); XCTAssertEqual(offer.label, "Offer price")
        for _ in 0..<3 where offer.frame.maxY > app.frame.height * 0.6 { app.swipeUp() }
        offer.tap(); offer.typeText("4.99"); app.buttons["dismissEditorKeyboard"].tap()
        pick(introEnd, for: "offerEnd", in: app)
        XCTAssertTrue(Self.shows(shownDate("offerEnd", in: app), introEnd), "The intro end picker shows the end that is saved")
        XCTAssertTrue(Self.shows(shownDate("firstPayment", in: app), first))
        capture(app, name: "en-Add-subscription-terms")
        app.swipeUp(); capture(app, name: "en-Add-subscription-terms-bottom")
        save(app)
        openDetail("Gym", in: app)
        XCTAssertTrue(text("In 2 days", in: app).exists, "The first charge is the first payment picked")
        XCTAssertTrue(text("Intro price ends on " + Self.day(introEnd), in: app).exists)
        XCTAssertTrue(text("$4.99 → $11.99", in: app).exists)
        back(app)

        let trialEnd = Self.shift(Self.today, days: 10)
        openAddMenu(app); app.buttons["newTrial"].firstMatch.tap()
        capture(app, name: "en-Add-trial-brand")
        app.buttons["nextSubscriptionStep"].tap()
        pick(trialEnd, for: "trialEnd", in: app)
        XCTAssertTrue(Self.shows(shownDate("trialEnd", in: app), trialEnd), "The trial end picker shows the end that is saved")
        type("Streamy", "9.99", priceField: "subscriptionPrice", in: app)
        XCTAssertEqual(app.textFields["subscriptionPrice"].label, "Price after the trial")
        capture(app, name: "en-Add-trial-terms")
        app.swipeUp(); capture(app, name: "en-Add-trial-terms-bottom")
        save(app)
        openDetail("Streamy", in: app)
        XCTAssertTrue(text("In 10 days", in: app).exists, "The first charge is the trial's end")
        XCTAssertTrue(text("First payment", in: app).exists)
        XCTAssertTrue(text("Free trial ends with this payment", in: app).exists, "The trial ends on its first charge")
        XCTAssertTrue(text("Cancel before " + Self.day(trialEnd) + " to pay nothing.", in: app).exists)
        XCTAssertTrue(app.buttons["cancelTrial"].exists)
        XCTAssertTrue(text("$9.99", in: app).exists)
        back(app)

        let purchase = Self.shift(Self.today, days: 5)
        openAddMenu(app); app.buttons["newLicense"].firstMatch.tap()
        capture(app, name: "en-Add-license-brand")
        app.buttons["nextSubscriptionStep"].tap()
        type("Sketchy", "29", priceField: "licensePrice", in: app)
        XCTAssertEqual(app.textFields["licensePrice"].label, "License price")
        pick(purchase, for: "purchaseDate", in: app)
        XCTAssertTrue(Self.shows(shownDate("purchaseDate", in: app), purchase))
        let cycle = app.buttons["billingCycle"]
        for _ in 0..<4 where !cycle.isHittable { app.swipeUp() }
        XCTAssertTrue(cycle.label.hasPrefix("Updates period"), cycle.label)
        XCTAssertTrue(cycle.label.contains("Yearly"), "A new license starts yearly")
        let renewal = app.textFields["renewalPrice"]
        for _ in 0..<4 where !renewal.isHittable { app.swipeUp() }
        XCTAssertEqual(renewal.label, "Updates renewal")
        renewal.tap(); renewal.typeText("19"); app.buttons["dismissEditorKeyboard"].tap()
        capture(app, name: "en-Add-license-terms")
        app.swipeUp(); capture(app, name: "en-Add-license-terms-bottom")
        save(app)
        openDetail("Sketchy", in: app)
        XCTAssertTrue(text("In 5 days", in: app).exists, "The license is charged on its purchase day")
        XCTAssertTrue(text("Updates included until " + Self.day(Self.shift(purchase, years: 1)), in: app).exists, "One year of updates from the purchase")
        XCTAssertTrue(text("Then $19.00 a year to renew them, if you want.", in: app).exists, "The renewal is the updates price")
        XCTAssertTrue(text("$29.00", in: app).exists, "The license price is what the purchase costs")
        XCTAssertFalse(app.buttons["managePendingPrice"].exists)
    }

    func testAddTrialAndLicenseInUkrainian() {
        let app = application(language: "uk", count: 1); app.launchArguments.append("--fixture-pro"); app.launch()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10))
        openAddMenu(app); capture(app, name: "uk-Add-menu-pro")
        app.buttons["newTrial"].firstMatch.tap()
        capture(app, name: "uk-Add-trial-brand")
        app.buttons["nextSubscriptionStep"].tap()
        type("Пробна", "9.99", priceField: "subscriptionPrice", in: app)
        XCTAssertEqual(app.textFields["subscriptionPrice"].label, "Ціна після пробного періоду")
        capture(app, name: "uk-Add-trial-terms")
        app.swipeUp(); capture(app, name: "uk-Add-trial-terms-bottom")
        save(app)
        openDetail("Пробна", in: app, uk: true)
        XCTAssertTrue(app.buttons["cancelTrial"].exists)
        back(app)

        openAddMenu(app); app.buttons["newLicense"].firstMatch.tap()
        capture(app, name: "uk-Add-license-brand")
        app.buttons["nextSubscriptionStep"].tap()
        type("Ліцензія", "29", priceField: "licensePrice", in: app)
        XCTAssertEqual(app.textFields["licensePrice"].label, "Ціна ліцензії")
        let renewal = app.textFields["renewalPrice"]
        for _ in 0..<4 where !renewal.isHittable { app.swipeUp() }
        renewal.tap(); renewal.typeText("19"); app.buttons["dismissEditorKeyboard"].tap()
        capture(app, name: "uk-Add-license-terms")
        app.swipeUp(); capture(app, name: "uk-Add-license-terms-bottom")
        save(app)
        openDetail("Ліцензія", in: app, uk: true)
        XCTAssertTrue(text("$29.00", in: app).exists)
        XCTAssertTrue(text("$19.00", in: app).exists)
    }

    func testFreeMenuLocksTrialAndLicense() {
        let app = application(count: 1); app.launch()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10))
        openAddMenu(app)
        capture(app, name: "en-Add-menu-free")
        XCTAssertTrue(menuText(app, "newTrial").contains("Pro"), "A free user hears and sees the lock: " + menuText(app, "newTrial"))
        XCTAssertTrue(menuText(app, "newLicense").contains("Pro"))
        XCTAssertFalse(menuText(app, "newSubscription").contains("Pro"))
        for item in ["newTrial", "newLicense"] {
            openAddMenu(app)
            app.buttons[item].firstMatch.tap()
            XCTAssertTrue(app.buttons["Restore purchases"].waitForExistence(timeout: 5), item + " opens the paywall")
            closePaywall(app)
        }
        openAddMenu(app); app.buttons["newSubscription"].firstMatch.tap()
        app.buttons["nextSubscriptionStep"].tap()
        let intro = app.descendants(matching: .any)["introOffer"].firstMatch
        XCTAssertTrue(intro.waitForExistence(timeout: 5))
        for _ in 0..<4 where !intro.isHittable { app.swipeUp() }
        XCTAssertEqual(intro.value as? String, "Pro")
        capture(app, name: "en-Add-subscription-terms-free")
        intro.tap()
        XCTAssertTrue(app.buttons["Restore purchases"].waitForExistence(timeout: 5), "The lower start opens the paywall")
        closePaywall(app)
        XCTAssertFalse(app.textFields["offerPrice"].exists)
        app.buttons["closeSubscriptionEditor"].tap()
        XCTAssertTrue(app.buttons["saveSubscription"].waitForNonExistence(timeout: 5))
        openAddMenu(app); app.buttons["newInstallment"].firstMatch.tap()
        XCTAssertTrue(app.textFields["installmentName"].waitForExistence(timeout: 5))
    }

    func testLargestUkrainianTextOverEachAddFlow() throws {
        let app = application(language: "uk", count: 1)
        app.launchArguments += ["--fixture-pro", "--largest-text"]; app.launch()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 10))
        openAddMenu(app); capture(app, name: "uk-AX-Add-menu")
        app.buttons["newSubscription"].firstMatch.tap()
        for (item, flow) in [("newSubscription", "subscription"), ("newTrial", "trial"), ("newLicense", "license")] {
            if flow != "subscription" { openAddMenu(app); app.buttons[item].firstMatch.tap() }
            XCTAssertTrue(app.buttons["nextSubscriptionStep"].waitForExistence(timeout: 5))
            capture(app, name: "uk-AX-Add-" + flow + "-brand")
            if #available(iOS 17, *) { try auditVisibleContent(app) }
            app.buttons["nextSubscriptionStep"].tap()
            XCTAssertTrue(app.buttons["saveSubscription"].waitForExistence(timeout: 5))
            // Filled in, so the preview renders; the trial's free price also brings up the footnote that explains a disabled Save.
            switch flow {
            case "subscription":
                type("Тест", "11.99", priceField: "subscriptionPrice", in: app)
                let intro = app.descendants(matching: .any)["introOffer"].firstMatch
                for _ in 0..<8 where !intro.isHittable { app.swipeUp() }
                intro.tap()
                let offer = app.textFields["offerPrice"]
                XCTAssertTrue(offer.waitForExistence(timeout: 5))
                reveal(offer, in: app); offer.tap(); offer.typeText("4.99"); app.buttons["dismissEditorKeyboard"].tap()
            case "trial":
                type("Тест", "0", priceField: "subscriptionPrice", in: app)
                XCTAssertTrue(app.staticTexts["saveBlocked"].waitForExistence(timeout: 5), "A free price after the trial explains why Save is off")
            default:
                type("Тест", "29", priceField: "licensePrice", in: app)
                let renewal = app.textFields["renewalPrice"]
                reveal(renewal, in: app); renewal.tap(); renewal.typeText("19"); app.buttons["dismissEditorKeyboard"].tap()
            }
            for _ in 0..<8 { app.swipeDown() }
            for page in 0..<6 {
                capture(app, name: "uk-AX-Add-" + flow + "-terms-" + String(page))
                if #available(iOS 17, *) { try auditVisibleContent(app) }
                app.swipeUp()
            }
            XCTAssertTrue(app.descendants(matching: .any)["planPreview"].firstMatch.exists, "The preview was rendered and audited")
            app.buttons["closeSubscriptionEditor"].tap()
            let discard = app.buttons["Скасувати зміни"]
            if discard.waitForExistence(timeout: 2) { discard.tap() }
            XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 5))
        }
    }

    private func openAddMenu(_ app: XCUIApplication) {
        let add = app.navigationBars.buttons["addSubscription"].firstMatch, item = app.buttons["newSubscription"].firstMatch
        // A tap while a sheet is still dismissing does not open the menu.
        for _ in 0..<3 where !item.isHittable {
            XCTAssertTrue(add.waitForExistence(timeout: 5)); add.tap()
            _ = item.waitForExistence(timeout: 3)
        }
        XCTAssertTrue(item.isHittable)
    }
    // Over the editor two sheets each have a "Cancel" button; the paywall's is the one in its own navigation bar.
    private func closePaywall(_ app: XCUIApplication) {
        app.navigationBars.containing(NSPredicate(format: "label == 'SubEye Pro'")).buttons["Cancel"].firstMatch.tap()
        XCTAssertTrue(app.buttons["Restore purchases"].waitForNonExistence(timeout: 5))
    }
    private func menuText(_ app: XCUIApplication, _ identifier: String) -> String {
        let item = app.buttons[identifier].firstMatch
        return item.label + " " + (item.value as? String ?? "")
    }
    private func type(_ name: String, _ price: String, priceField: String, in app: XCUIApplication) {
        let field = app.textFields["subscriptionName"]
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        reveal(field, in: app); field.tap(); field.typeText(name)
        app.buttons["nextEditorField"].tap()
        app.textFields[priceField].typeText(price)
        app.buttons["dismissEditorKeyboard"].tap()
    }
    private func save(_ app: XCUIApplication) {
        let save = app.buttons["saveSubscription"]
        XCTAssertTrue(save.isEnabled, app.staticTexts["saveBlocked"].exists ? app.staticTexts["saveBlocked"].label : "Save is off")
        save.tap()
        XCTAssertTrue(save.waitForNonExistence(timeout: 10))
    }
    private func openDetail(_ name: String, in app: XCUIApplication, uk: Bool = false) {
        app.tabBars.buttons[uk ? "Підписки" : "Subscriptions"].tap()
        let row = app.staticTexts[name].firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 5)); row.tap()
        XCTAssertTrue(app.staticTexts["subscriptionDetailName"].waitForExistence(timeout: 5))
    }
    private func text(_ value: String, in app: XCUIApplication) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", value)).firstMatch
    }
    // Short drags, not swipes: at the largest text sizes one swipe carries a field from under the footer to under the bar.
    private func reveal(_ element: XCUIElement, in app: XCUIApplication) {
        let middle = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        for _ in 0..<12 {
            if element.frame.maxY > app.frame.height * 0.65 { middle.press(forDuration: 0.05, thenDragTo: middle.withOffset(CGVector(dx: 0, dy: -150))) }
            else if element.frame.minY < app.frame.height * 0.2 { middle.press(forDuration: 0.05, thenDragTo: middle.withOffset(CGVector(dx: 0, dy: 150))) }
            else { return }
        }
    }
    private func pick(_ date: Date, for identifier: String, in app: XCUIApplication) {
        let picker = app.descendants(matching: .any)[identifier].firstMatch
        for _ in 0..<4 where !picker.isHittable { app.swipeUp() }
        picker.buttons.firstMatch.tap()
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "EEEE, MMMM d"
        let day = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", formatter.string(from: date))).firstMatch
        if !day.waitForExistence(timeout: 3) { app.buttons["Next Month"].firstMatch.tap() }
        if !day.waitForExistence(timeout: 3) {
            let attachment = XCTAttachment(string: app.debugDescription); attachment.lifetime = .keepAlways; add(attachment)
        }
        XCTAssertTrue(day.exists, identifier + ": no day " + formatter.string(from: date))
        day.tap()
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.12)).tap()
        XCTAssertTrue(day.waitForNonExistence(timeout: 3), "The calendar closes")
    }
    private func shownDate(_ identifier: String, in app: XCUIApplication) -> String {
        let picker = app.descendants(matching: .any)[identifier].firstMatch
        XCTAssertTrue(picker.waitForExistence(timeout: 5), identifier)
        let shown = ([picker.label, picker.value as? String ?? ""] + picker.buttons.allElementsBoundByIndex.map { $0.value as? String ?? "" }).joined(separator: " ")
        let attachment = XCTAttachment(string: identifier + ": " + shown + "\n" + picker.debugDescription); attachment.lifetime = .keepAlways; add(attachment)
        return shown
    }
    private static var utc: Calendar { var calendar = Calendar(identifier: .gregorian); calendar.timeZone = TimeZone(secondsFromGMT: 0)!; return calendar }
    private static var today: Date { utc.date(from: Calendar.current.dateComponents([.year, .month, .day], from: Date()))! }
    private static func shift(_ day: Date, days: Int = 0, years: Int = 0) -> Date {
        utc.date(byAdding: DateComponents(year: years, day: days), to: day)!
    }
    private static func day(_ date: Date) -> String {
        let format = Date.FormatStyle(locale: Locale(identifier: "en_US"), timeZone: TimeZone(secondsFromGMT: 0)!).day().month(.abbreviated)
        return date.formatted(utc.component(.year, from: date) == utc.component(.year, from: today) ? format : format.year())
    }
    // The compact picker shows "Nov 4, 2026" where it has room and "11/4/26" where it does not.
    private static func shows(_ shown: String, _ date: Date) -> Bool {
        ["M/d/yy", "MMM d, yyyy"].contains { format in
            let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.timeZone = TimeZone(secondsFromGMT: 0)
            formatter.dateFormat = format
            return shown.contains(formatter.string(from: date))
        }
    }

    private func startSubscription(_ app: XCUIApplication) {
        app.navigationBars.buttons["addSubscription"].firstMatch.tap()
        let item = app.buttons["newSubscription"].firstMatch
        XCTAssertTrue(item.waitForExistence(timeout: 5)); item.tap()
    }

    private func openDeveloperTools(_ app: XCUIApplication) {
        let settings = app.tabBars.buttons["Settings"]
        XCTAssertTrue(settings.waitForExistence(timeout: 10)); settings.tap()
        let tools = app.buttons["Developer Tools"]
        for _ in 0..<8 where !tools.isHittable { app.swipeUp() }
        tools.tap()
    }

    private func openScenario(_ name: String, in app: XCUIApplication) {
        let row = app.buttons["scenario-" + name]
        XCTAssertTrue(row.waitForExistence(timeout: 5), name)
        for _ in 0..<6 where !row.isHittable { if row.frame.midY < app.frame.midY { app.swipeDown() } else { app.swipeUp() } }
        row.tap()
    }

    private func back(_ app: XCUIApplication) { app.navigationBars.buttons.element(boundBy: 0).tap() }

    private func application(language: String = "en", count: Int = 0) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--test-store", UUID().uuidString, "--fixture-count", String(count), "-AppleLanguages", "(" + language + ")", "-AppleLocale", language == "uk" ? "uk_UA" : "en_US"]
        return app
    }
}
