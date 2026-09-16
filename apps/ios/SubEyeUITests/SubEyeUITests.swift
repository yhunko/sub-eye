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
        app.tabBars.buttons[uk ? "Налаштування" : "Settings"].tap()
        app.buttons["settingsCurrency"].tap()
        XCTAssertTrue(app.searchFields.firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.tabBars.firstMatch.waitForNonExistence(timeout: 5))
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["settingsCurrency"].exists)
        capture(app, name: language + "-Settings")
        XCTAssertFalse(app.buttons["settingsTimezone"].exists)
        app.tabBars.buttons[uk ? "Головна" : "Home"].tap()
        app.buttons["addSubscription"].firstMatch.tap(); app.buttons["nextSubscriptionStep"].tap()
        let name = app.textFields["subscriptionName"]
        XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap(); name.typeText("Draft survives back")
        let price = app.textFields["subscriptionPrice"]; price.tap(); price.typeText("1")
        XCTAssertGreaterThan(app.buttons["currencyPicker"].frame.minX, price.frame.maxX)
        app.buttons["nextSubscriptionStep"].tap()
        XCTAssertTrue(app.buttons["offer-none"].waitForExistence(timeout: 5))
        capture(app, name: language + "-Add-dates")
        app.buttons["offer-trial"].tap()
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(name.waitForExistence(timeout: 5)); XCTAssertEqual(name.value as? String, "Draft survives back")
        capture(app, name: language + "-Add-price")
        app.buttons["subscriptionBrand"].tap()
        XCTAssertTrue(app.searchFields.firstMatch.waitForExistence(timeout: 5))
        capture(app, name: language + "-Brand-picker")
        app.navigationBars.buttons.firstMatch.tap()
        app.buttons["nextSubscriptionStep"].tap()
        XCTAssertTrue(app.buttons["offer-trial"].isSelected)
        app.buttons["closeSubscriptionEditor"].tap()
        XCTAssertFalse(app.alerts.firstMatch.exists)
        capture(app, name: language + "-Discard-menu")
        app.buttons[uk ? "Скасувати зміни" : "Discard changes"].tap()
        XCTAssertTrue(app.buttons["addSubscription"].firstMatch.waitForExistence(timeout: 5))
    }
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
        app.buttons["addSubscription"].firstMatch.tap()
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
            app.buttons["addSubscription"].firstMatch.tap()
            app.buttons["nextSubscriptionStep"].tap()
            let nameField = app.textFields["subscriptionName"]
            XCTAssertTrue(nameField.waitForExistence(timeout: 5)); nameField.tap(); nameField.typeText(name)
            app.buttons["nextEditorField"].tap()
            app.textFields["subscriptionPrice"].typeText("4.99")
            app.buttons["dismissEditorKeyboard"].tap()
            app.buttons["nextSubscriptionStep"].tap()
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

    private func application(language: String = "en", count: Int = 0) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--test-store", UUID().uuidString, "--fixture-count", String(count), "-AppleLanguages", "(" + language + ")", "-AppleLocale", language == "uk" ? "uk_UA" : "en_US"]
        return app
    }
}
