import XCTest
@testable import SubEyeCore

final class InstallmentTests: XCTestCase {
    let now = Day.parse("2026-09-15T12:00:00Z")!

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
