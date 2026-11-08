import XCTest
@testable import SubEyeCore

final class InstallmentTests: XCTestCase {
    let now = Day.parse("2026-09-15T12:00:00Z")!
    let rates = ExchangeRates(rates: ["usd": 1, "uah": 40])

    func testEqualSplitPutsTheRemainderOnTheLastPaymentAndSumsExactly() {
        let schedule = Installments.payments(plan(total: "3407.00", payment: "1135.67", count: 3, first: "2026-07-04"), today: day("2026-07-01"))
        XCTAssertEqual(schedule.map(\.amount), [d("1135.67"), d("1135.67"), d("1135.66")])
        XCTAssertEqual(schedule.map { Day.key($0.date) }, ["2026-07-04", "2026-08-04", "2026-09-04"])
        XCTAssertEqual(schedule.reduce(0) { $0 + $1.amount }, d("3407.00"))
    }

    func testRegularPaymentRoundsUpAndRefusesASplitThatLeavesNothingForTheLast() {
        XCTAssertEqual(Installments.regularPayment(total: d("3407.00"), count: 3), d("1135.67"))
        XCTAssertEqual(Installments.regularPayment(total: 100, count: 3), d("33.34"))
        let last = Installments.payments(plan(total: "100.00", payment: "33.34", count: 3, first: "2026-10-01"), today: now).last?.amount
        XCTAssertEqual(last, d("33.32"))
        XCTAssertEqual(Installments.regularPayment(total: 500, count: 1), 500)
        XCTAssertNil(Installments.regularPayment(total: 101, count: 120))
        XCTAssertNil(Installments.regularPayment(total: d("1.00"), count: 101))
    }

    func testMonthEndAnchorKeepsItsDayThroughShortMonths() {
        XCTAssertEqual(keys(plan(count: 3, first: "2026-01-31")), ["2026-01-31", "2026-02-28", "2026-03-31"])
        XCTAssertEqual(keys(plan(count: 3, first: "2024-01-31")), ["2024-01-31", "2024-02-29", "2024-03-31"])
        for anchor in [29, 30, 31] {
            let dates = keys(plan(count: 24, first: "2027-01-\(anchor)"))
            XCTAssertEqual(dates[1], "2027-02-28")
            XCTAssertEqual(dates[2], "2027-03-\(anchor)")
            XCTAssertEqual(dates[13], "2028-02-29")
            XCTAssertEqual(dates[14], "2028-03-\(anchor)")
        }
    }

    func testEveryTwoWeeksCrossesMonthAndYearEnds() {
        let dates = keys(plan(count: 4, every: 2, period: .week, first: "2026-12-17"))
        XCTAssertEqual(dates, ["2026-12-17", "2026-12-31", "2027-01-14", "2027-01-28"])
    }

    func testAPaymentIsPaidOnceItsDayHasPassed() {
        let schedule = Installments.payments(plan(count: 3, every: 1, period: .day, first: "2026-09-14"), today: day("2026-09-15"))
        XCTAssertEqual(schedule.map(\.paid), [true, false, false])
    }

    func testPaidAtPurchaseCoversOnlyAFirstPaymentOnTheCreationDay() {
        var sameDay = plan(count: 3, first: "2026-09-15"); sameDay.paidAtPurchase = true
        XCTAssertEqual(Installments.payments(sameDay, today: day("2026-09-15")).map(\.paid), [true, false, false])

        var lateEastOfUTC = plan(count: 3, first: "2026-09-15", now: Day.parse("2026-09-14T22:30:00Z")!)
        lateEastOfUTC.paidAtPurchase = true
        XCTAssertEqual(Installments.payments(lateEastOfUTC, today: day("2026-09-15")).first?.paid, true)

        var moved = sameDay; moved.firstPaymentDate = "2026-10-15"
        XCTAssertEqual(Installments.payments(moved, today: day("2026-10-15")).first?.paid, false)

        var daily = plan(count: 3, every: 1, period: .day, first: "2026-09-15"); daily.paidAtPurchase = true
        XCTAssertEqual(Installments.payments(daily, today: day("2026-09-15")).map(\.paid), [true, false, false])
        daily.firstPaymentDate = "2026-09-17"
        XCTAssertEqual(Installments.payments(daily, today: day("2026-09-17")).first?.paid, false)
    }

    func testPayoffDropsPaymentsFromItsDayOnAndKeepsTheStoredAmount() {
        var base = plan(total: "12000.00", payment: "1000.00", count: 12, first: "2026-01-10")
        base.payoffAmount = "6500.00"
        for (paidOff, kept) in [("2026-01-05", 0), ("2026-06-10", 5), ("2026-06-20", 6), ("2026-06-10T09:15:00.000Z", 5)] {
            var value = base; value.paidOffAt = paidOff
            XCTAssertEqual(Installments.payments(value, today: day("2026-09-15")).count, kept, paidOff)
            XCTAssertEqual(Installments.payoff(value)?.amount, d("6500.00"))
            XCTAssertEqual(Installments.payoff(value)?.date, day(String(paidOff.prefix(10))))
        }
        XCTAssertEqual(Installments.remaining(base, on: day("2026-06-10")), d("7000.00"))
    }

    func testSameDayPayoffKeepsThePaymentChargedAtPurchase() {
        var value = plan(total: "3407.00", payment: "1135.67", count: 3, first: "2026-09-15"); value.paidAtPurchase = true
        XCTAssertEqual(Installments.remaining(value, on: day("2026-09-15")), d("2271.33"))
        value.paidOffAt = "2026-09-15"; value.payoffAmount = "2271.33"
        XCTAssertEqual(Installments.payments(value, today: day("2026-09-15")).map(\.number), [1])
        let totals = Installments.totals(value, today: day("2026-09-15"))
        XCTAssertEqual(totals.paid, d("3407.00"))
        XCTAssertEqual(totals.left, 0)
    }

    func testAPayoffBelowWhatWasLeftLowersWhatThePlanCost() {
        var value = plan(total: "12000.00", payment: "1000.00", count: 12, first: "2026-01-10")
        XCTAssertEqual(Installments.remaining(value, on: day("2026-06-01")), d("7000.00"))
        value.paidOffAt = "2026-06-01"; value.payoffAmount = "6000.00"
        XCTAssertEqual(Installments.remaining(value, on: day("2026-06-01")), d("7000.00"))
        let totals = Installments.totals(value, today: day("2026-06-01"))
        XCTAssertEqual(totals.spent, d("11000.00"))
        XCTAssertEqual(totals.paid, d("11000.00"))
        XCTAssertEqual(totals.left, 0)
    }

    func testAPayoffDatedAheadIsStillLeftToPay() {
        var value = plan(total: "12000.00", payment: "1000.00", count: 12, first: "2026-01-10")
        value.paidOffAt = "2026-06-20"; value.payoffAmount = "6000.00"
        let totals = Installments.totals(value, today: day("2026-06-01"))
        XCTAssertEqual(totals.paid, d("5000.00"))
        XCTAssertEqual(totals.left, d("7000.00"))
    }

    func testAPlanEnteredMidTermCountsThePaymentsAlreadyMade() {
        let value = plan(total: "12000.00", payment: "1000.00", count: 12, first: "2026-05-10")
        XCTAssertEqual(Installments.payments(value, today: day("2026-09-15")).filter(\.paid).count, 5)
        let totals = Installments.totals(value, today: day("2026-09-15"))
        XCTAssertEqual(totals.paid, d("5000.00"))
        XCTAssertEqual(totals.left, d("7000.00"))
    }

    func testValidatorAcceptsEverythingTheScheduleCanHandle() throws {
        var dong = plan(total: "1200000000.00", payment: "25000000.00", count: 48, first: "2026-10-01")
        dong.currency = "vnd"; dong.price = "1000000000.00"
        try LegacyMigration.validate(dong)
        XCTAssertEqual(Installments.payments(dong, today: now).count, 48)
        XCTAssertEqual(Installments.payments(dong, today: now).last?.amount, d("25000000.00"))
        dong.paidOffAt = "2027-01-01"; dong.payoffAmount = "150000000.00"
        try LegacyMigration.validate(dong)
        XCTAssertEqual(Installments.payoff(dong)?.amount, d("150000000.00"))
        var later = plan(total: "4800.00", payment: "10.00", count: 480, every: 1, period: .week, first: "2026-10-01")
        later.kind = "subscriptionBox"
        try LegacyMigration.validate(later)
    }

    func testValidatorRejectsPlansTheScheduleCannotHandle() {
        var noLast = plan(total: "100.00", payment: "50.00", count: 3, first: "2026-10-01")
        var empty = plan(count: 3, first: "2026-10-01"); empty.name = "  "
        var fraction = plan(count: 3, first: "2026-10-01"); fraction.payment = "10.001"
        var dateOnly = plan(count: 3, first: "2026-10-01"); dateOnly.paidOffAt = "2026-11-01"
        var amountOnly = plan(count: 3, first: "2026-10-01"); amountOnly.payoffAmount = "10.00"
        var freePrice = plan(count: 3, first: "2026-10-01"); freePrice.price = "0"
        var badPayoff = plan(count: 3, first: "2026-10-01"); badPayoff.paidOffAt = "2026-11-01"; badPayoff.payoffAmount = "ten"
        for (label, value) in [("no last", noLast), ("empty name", empty), ("three decimals", fraction),
                               ("date only", dateOnly), ("amount only", amountOnly), ("zero price", freePrice),
                               ("unreadable payoff", badPayoff),
                               ("no payments", plan(count: 0, first: "2026-10-01")), ("too many", plan(total: "200000.00", count: 1001, first: "2026-10-01"))] {
            XCTAssertThrowsError(try LegacyMigration.validate(value), label)
        }
        noLast.payment = "49.99"
        XCTAssertNoThrow(try LegacyMigration.validate(noLast))
    }

    func testEditorAcceptsOnlyMonthlyAndEveryTwoWeeksUpTo360() {
        XCTAssertTrue(Installments.editorAccepts(every: 1, period: .month, count: 360))
        XCTAssertTrue(Installments.editorAccepts(every: 2, period: .week, count: 4))
        XCTAssertFalse(Installments.editorAccepts(every: 1, period: .week, count: 4))
        XCTAssertFalse(Installments.editorAccepts(every: 1, period: .month, count: 361))
    }

    func testPlanThatEndedEarlierThisMonthStillCountsInTheMonthTotal() {
        let dashboard = presentation([plan(count: 3, first: "2026-07-05")]).dashboard
        XCTAssertEqual(dashboard.monthTotal, 100, "Its last payment on Sep 5 belongs to September")
        XCTAssertEqual(dashboard.remaining, 0)
    }

    func testPaymentChargedAtPurchaseCountsInTheMonthButIsNotStillDue() {
        var bought = plan(count: 3, first: "2026-09-15"); bought.paidAtPurchase = true
        let dashboard = presentation([bought]).dashboard
        XCTAssertEqual(dashboard.monthTotal, 100)
        XCTAssertEqual(dashboard.remaining, 0, "Charged at checkout today, so nothing is left to pay this month")
    }

    func testEarlyPayoffReplacesTheLaterPaymentsOnceAndOverpaymentFollowsWhatWasSpent() throws {
        var loan = plan(total: "12000.00", payment: "1000.00", count: 12, first: "2026-05-10")
        loan.paidOffAt = "2026-09-12T00:00:00.000Z"; loan.payoffAmount = "6000.00"; loan.price = "10000.00"
        let model = presentation([loan])
        let september = model.dashboard.monthEvents
        XCTAssertEqual(september.map { Day.key($0.date) }, ["2026-09-10", "2026-09-12"])
        XCTAssertEqual(september.map(\.amount), [1000, 6000])
        XCTAssertEqual(september.map { $0.installment?.number }, [5, nil])
        XCTAssertEqual(model.dashboard.nextMonth, 0, "Payments after the payoff are gone")
        let row = try XCTUnwrap(model.installments?.first)
        XCTAssertEqual(row.overpayment, 1000, "11,000 spent against a 10,000 price, not the 12,000 the schedule would have cost")
        XCTAssertEqual([row.paid, row.left], [11000, 0])
        XCTAssertTrue(row.finished)
        XCTAssertEqual(row.endDate, day("2026-09-12"))
        loan.price = "11500.00"
        XCTAssertNil(presentation([loan]).installments?.first?.overpayment, "Paying less than the price is no overpayment")
    }

    func testPayoffOnTheDayOfAPurchasePaymentKeepsDistinctIds() {
        var bought = plan(count: 3, first: "2026-09-15"); bought.paidAtPurchase = true
        bought.paidOffAt = "2026-09-15T00:00:00.000Z"; bought.payoffAmount = "200.00"
        let dashboard = presentation([bought]).dashboard, events = dashboard.monthEvents
        XCTAssertEqual(dashboard.remaining, 0, "A payoff counts as paid once its day has come")
        XCTAssertEqual(events.map { $0.installment?.number }, [nil, 1])
        XCTAssertEqual(Set(events.map(\.id)).count, 2)
        XCTAssertTrue(events.allSatisfy { $0.id.hasPrefix("installment:") })
    }

    func testNextPaymentIsConvertedToThePreferredCurrency() throws {
        let row = try XCTUnwrap(presentation([plan(total: "1200.00", payment: "400.00", count: 3, first: "2026-10-01")], currency: "usd").installments?.first)
        XCTAssertEqual(row.nextAmount, 400)
        XCTAssertEqual(row.nextConverted, 10)
        XCTAssertEqual(row.nextDate, day("2026-10-01"))
    }

    func testRowsListActivePlansByNextPaymentAndTheLaunchCacheKeepsForty() {
        var later = plan(count: 3, first: "2026-11-01"); later.id = "later"
        var sooner = plan(count: 3, first: "2026-10-01"); sooner.id = "sooner"
        var done = plan(count: 3, first: "2026-06-01"); done.id = "done"
        XCTAssertEqual(presentation([done, later, sooner]).installments?.map(\.id), ["sooner", "later", "done"])
        let many = (0..<41).map { index in var value = plan(count: 3, first: "2026-10-01"); value.id = "p\(index)"; return value }
        XCTAssertEqual(presentation(many).launchPreview().installments?.count, 40)
    }

    func testCachedPresentationsAndEventsWithoutTheNewFieldsStillDecode() throws {
        func strip(_ value: some Encodable, _ key: String) throws -> Data {
            var object = try JSONSerialization.jsonObject(with: JSONCodec.encode(value)) as! [String: Any]
            object.removeValue(forKey: key)
            return try JSONSerialization.data(withJSONObject: object)
        }
        let model = presentation([plan(count: 3, first: "2026-09-10")])
        let event = try XCTUnwrap(model.dashboard.monthEvents.first)
        XCTAssertNil(try JSONCodec.decode(Presentation.self, strip(model, "installments")).installments)
        XCTAssertNil(try JSONCodec.decode(CalendarEvent.self, strip(event, "installment")).installment)
    }

    func testStoreCalendarMergesPlanEventsInOrder() async throws {
        let store = SubscriptionRepository(url: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString).appendingPathComponent("store.sqlite"))
        let biweekly = plan(total: "3600.00", payment: "1200.00", count: 3, every: 2, period: .week, first: "2026-09-06")
        let sub = Subscription(id: "s", name: "Test", cost: "20.00", currency: "usd", paymentDate: "2026-01-20T00:00:00.000Z", now: now)
        let doc = StoreDocument(preferences: .init(currency: "usd"), subscriptions: [sub], installments: [biweekly])
        _ = try await store.migrate(.init(slotA: try JSONCodec.string(doc), sourceExists: true), now: now)
        let events = try await store.calendar(from: day("2026-09-01"), through: day("2026-09-30"), rates: rates, now: now)
        XCTAssertEqual(events.map(\.id), ["installment:plan:payment:2026-09-06", "installment:plan:payment:2026-09-20", "s:payment:2026-09-20"],
                       "30 dollars of plan before the 20-dollar renewal on the same day")
    }

    private func presentation(_ plans: [InstallmentPlan], currency: String = "uah") -> Presentation {
        Projection.presentation(StoreDocument(preferences: .init(currency: currency), installments: plans), rates: rates, now: now, revision: 0)
    }
    private func plan(total: String = "300.00", payment: String = "100.00", count: Int, every: Int = 1,
                      period: BillingPeriod = .month, first: String, now: Date? = nil) -> InstallmentPlan {
        InstallmentPlan(id: "plan", name: "MacBook", symbol: "laptopcomputer", tint: "blue", currency: "uah",
                        total: total, payment: payment, paymentCount: count, every: every, period: period,
                        firstPaymentDate: first, now: now ?? self.now)
    }
    private func keys(_ plan: InstallmentPlan) -> [String] { Installments.payments(plan, today: now).map { Day.key($0.date) } }
    private func day(_ key: String) -> Date { Day.parse(key)! }
    private func d(_ text: String) -> Decimal { Decimal(string: text)! }
}
