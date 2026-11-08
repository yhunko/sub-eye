import XCTest
import SubEyeCore
@testable import SubEye

final class InstallmentCopyTests: XCTestCase {
    private let now = Day.localInstant(Day.parse("2026-09-15")!, hour: 6, minute: 0, zone: .gmt)

    func testEveryInstallmentReminderShapeHasCopyInBothLocales() throws {
        let plans = [
            plan("phone", first: "2026-09-16"), plan("sofa", first: "2026-09-16"), plan("bike", first: "2026-09-15"),
            plan("guitar", first: "2026-09-20"),
            plan("camera", first: "2026-09-16", count: 1), plan("tv", first: "2026-09-16", count: 1), plan("laptop", first: "2026-09-15", count: 1),
            plan("desk", first: "2026-09-25", count: 1)
        ]
        // Amounts are positive in any stored plan; a zero is the only way to reach the no-amount bodies.
        let free = [plan("drone", first: "2026-10-20", payment: 0), plan("kayak", first: "2026-10-23", count: 1, payment: 0)]
        let reminders = planned(plans) + planned(free)
        let shapes = Set(reminders.map { reminder in
            reminder.kind + (reminder.events.count == 1 ? ":single" : ":digest") + (reminder.lead == nil ? ":mixed" : "")
                + (reminder.events.allSatisfy { $0.amount > 0 } ? "" : ":noAmount")
        })
        let expected: Set = ["installment:single", "installment:digest", "installment:digest:mixed", "installment:single:noAmount",
                             "installmentFinal:single", "installmentFinal:digest", "installmentFinal:digest:mixed", "installmentFinal:single:noAmount",
                             "installmentPaidOff:single:noAmount", "installmentPaidOff:digest:noAmount"]
        XCTAssertTrue(expected.isSubset(of: shapes), "Missing shapes: \(expected.subtracting(shapes).sorted())")
        for locale in ["en", "uk"] {
            let text = try lookup(locale)
            for reminder in reminders {
                let message = reminder.message(text, money: { Display.money($0, "usd") })
                for line in [message.title, message.body] {
                    XCTAssertFalse(line.hasPrefix("notif_"), "\(locale) \(reminder.kind): \(line)")
                    XCTAssertFalse(line.contains("{"), "\(locale) \(reminder.kind): \(line)")
                }
            }
        }
    }

    #if NATIVE_DEVELOPMENT
    func testNotificationPreviewCoversEachInstallmentKindWithinThePendingLimit() {
        var settings = ReminderSettings(); settings.renewals = true; settings.installments = true
        let subscriptions = ["music", "news", "cloud"].enumerated().map { index, id in
            Subscription(id: id, name: id, cost: "10", currency: "usd", paymentDate: Day.iso(Day.parse(index == 0 ? "2026-09-20" : "2026-09-18")!), now: now)
        }
        let rows = Projection.rows(StoreDocument(preferences: .init(currency: "usd"), subscriptions: subscriptions), rates: .init(rates: ["usd": 1]), now: now)
        let planned = ReminderPlanner.plan(rows: rows, installments: [plan("phone", first: "2026-09-16", count: 3)], settings: settings, pro: false,
                                           rates: .init(rates: ["usd": 1]), currency: "usd", now: now, zone: .gmt)
        let shapes = NotificationService.previewShapes(planned)
        XCTAssertEqual(shapes.map(\.kind), ["renewal", "renewal", "installment", "installmentFinal", "installmentPaidOff"])
        XCTAssertLessThanOrEqual(ReminderPlanner.budget + shapes.count, 64)
    }
    #endif

    private func planned(_ plans: [InstallmentPlan]) -> [PlannedReminder] {
        var settings = ReminderSettings(); settings.installments = true; settings.installmentLeadDays = [0, 1]
        return ReminderPlanner.plan(rows: [], installments: plans, settings: settings, pro: true, rates: .init(rates: ["usd": 1]),
                                    currency: "usd", now: now, zone: .gmt)
    }
    private func lookup(_ locale: String) throws -> (String, [String: String]) -> String {
        let bundle = try XCTUnwrap(Bundle.main.path(forResource: locale, ofType: "lproj").flatMap(Bundle.init(path:)))
        return { key, arguments in
            arguments.reduce(bundle.localizedString(forKey: key, value: nil, table: nil)) { $0.replacingOccurrences(of: "{" + $1.key + "}", with: $1.value) }
        }
    }
    private func plan(_ id: String, first: String, count: Int = 6, payment: Int = 100) -> InstallmentPlan {
        InstallmentPlan(id: id, name: id, symbol: "iphone", tint: "blue", currency: "usd", total: String(payment * count) + ".00",
                        payment: String(payment) + ".00", paymentCount: count, firstPaymentDate: Day.iso(Day.parse(first)!), now: now)
    }
}
