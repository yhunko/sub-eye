import XCTest
import SubEyeCore
@testable import SubEye

@MainActor
final class InstallmentEditorTests: XCTestCase {
    private let created = Day.parse("2026-11-03T00:00:00.000Z")!
    private var draft: InstallmentPlan {
        InstallmentPlan(id: "car", name: " Car ", kind: .loan, symbol: "car.fill", tint: "blue", currency: "vnd", total: "", payment: "", paymentCount: 0,
                        firstPaymentDate: "2026-11-03T00:00:00.000Z", now: created)
    }

    private func type(_ text: String, into term: InstallmentEditor.Term, _ terms: InstallmentEditor.Terms) -> InstallmentEditor.Terms {
        text.indices.reduce(terms) { terms, index in InstallmentEditor.enter(String(text[...index]), in: term, terms) }
    }

    func testTypedPaymentKeepsATotalThatDoesNotSplitEvenly() {
        var terms = type("101", into: .total, .init())
        terms = type("120", into: .count, terms)
        XCTAssertEqual(terms.payment, "")
        terms = type("0.84", into: .payment, terms)
        XCTAssertEqual([terms.total, terms.count, terms.payment], ["101", "120", "0.84"])
    }

    func testLenderPaymentOverridesTheDerivedOneWithoutCycling() {
        var terms = type("1000", into: .total, .init())
        terms = type("3", into: .count, terms)
        XCTAssertEqual(terms.payment, "333.34")
        terms = type("333.33", into: .payment, terms)
        XCTAssertEqual([terms.total, terms.count, terms.payment], ["1000", "3", "333.33"])
    }

    func testRetypingAStoredPaymentLeavesTheTotal() {
        var terms = InstallmentEditor.Terms(total: "3407.00", count: "3", payment: "1135.67")
        terms = InstallmentEditor.enter("1135.6", in: .payment, terms)
        terms = InstallmentEditor.enter("1135.67", in: .payment, terms)
        XCTAssertEqual([terms.total, terms.count, terms.payment], ["3407.00", "3", "1135.67"])
    }

    func testDerivedFieldFollowsItsInputs() {
        var terms = type("300", into: .total, .init())
        terms = type("3", into: .count, terms)
        XCTAssertEqual(terms.payment, "100.00")
        terms = InstallmentEditor.enter("6", in: .count, terms)
        XCTAssertEqual(terms.payment, "50.00")
        terms = InstallmentEditor.enter("", in: .count, terms)
        XCTAssertEqual(terms.payment, "")
    }

    func testCreationDayIsTheLocalDayOfCreation() throws {
        var plan = draft
        plan.createdAt = "2026-11-03T23:00:00.000Z"
        let kyiv = try XCTUnwrap(TimeZone(identifier: "Europe/Kyiv"))
        XCTAssertEqual(InstallmentEditor.creationDay(original: plan, zone: kyiv, now: created), Day.parse("2026-11-04T00:00:00.000Z"))
        XCTAssertEqual(InstallmentEditor.creationDay(original: nil, zone: kyiv, now: Day.parse("2026-11-03T22:30:00.000Z")!), Day.parse("2026-11-04T00:00:00.000Z"))
    }

    func testOverpaymentCountsWhatAPaidOffPlanCost() throws {
        var plan = InstallmentPlan(id: "loan", name: "Loan", kind: .loan, symbol: "car.fill", tint: "blue", currency: "usd", total: "12000.00",
                                   payment: "1000.00", paymentCount: 12, firstPaymentDate: "2026-01-05T00:00:00.000Z", now: Day.parse("2026-01-01T00:00:00.000Z")!)
        plan.price = "10000.00"
        XCTAssertEqual(InstallmentEditor.overpayment(plan, today: created)?.amount, 2000)
        plan.paidOffAt = "2026-06-01T00:00:00.000Z"; plan.payoffAmount = "6000.00"
        let overpayment = try XCTUnwrap(InstallmentEditor.overpayment(plan, today: created))
        XCTAssertEqual(overpayment.amount, 1000)
        XCTAssertEqual(overpayment.share, 0.1, accuracy: 0.0001)
    }

    func testAmountsTakeLoanTotalsAboveTheSingleChargeCeiling() throws {
        let value = try InstallmentEditor.value(draft, total: "1 200 000 000", count: 120, payment: "10000000", price: "1000000000,5",
                                                firstPayment: created, atPurchase: false, creationDay: created)
        XCTAssertEqual(value.total, "1200000000.00")
        XCTAssertEqual(value.payment, "10000000.00")
        XCTAssertEqual(value.price, "1000000000.50")
        XCTAssertEqual(value.name, "Car")
        XCTAssertThrowsError(try InstallmentEditor.value(draft, total: "1000000000000", count: 1, payment: "1000000000000", price: "",
                                                         firstPayment: created, atPurchase: false, creationDay: created))
    }

    func testPaidAtPurchaseNeedsTheSwitchAndTheCreationDay() throws {
        func paid(_ on: Bool, _ first: Date) throws -> Bool? {
            try InstallmentEditor.value(draft, total: "3407", count: 3, payment: "1135.67", price: "", firstPayment: first, atPurchase: on, creationDay: created).paidAtPurchase
        }
        XCTAssertEqual(try paid(true, created), true)
        XCTAssertNil(try paid(false, created))
        XCTAssertNil(try paid(true, Day.shift(created, days: 31)))
        XCTAssertNil(try paid(true, Day.shift(created, days: -1)))
    }
}
