#if NATIVE_DEVELOPMENT
import SwiftUI
import SubEyeCore

enum DeveloperScenario: String, CaseIterable, Hashable {
    case priceIncrease, priceIncreaseLater, priceDecrease, priceCurrency, trialEnding, introEnding, offerStarting, licensePurchase, licenseUpdates, licenseRenewed
    case active, paused, cancelling, cancelled
    case homeSavingsNone, homeSavingsOne, homeSavingsSeveral, homeDecisions
    case installmentMidPlan, installmentLastTomorrow, installmentPaidOff, installmentPaidOffEarly, installmentMonthEnd

    static let pricing: [Self] = [.priceIncrease, .priceIncreaseLater, .priceDecrease, .priceCurrency, .trialEnding, .introEnding, .offerStarting, .licensePurchase, .licenseUpdates, .licenseRenewed]
    static let lifecycle: [Self] = [.active, .paused, .cancelling, .cancelled]
    static let home: [Self] = [.homeSavingsNone, .homeSavingsOne, .homeSavingsSeveral, .homeDecisions]
    static let installments: [Self] = [.installmentMidPlan, .installmentLastTomorrow, .installmentPaidOff, .installmentPaidOffEarly, .installmentMonthEnd]
    // Ended subscriptions that exist only to fill the savings row; no detail scenario opens them.
    private static let stopped = [(id: "developer-stopped-adobe", name: "Adobe Creative Cloud", domain: "adobe.com", cost: "22.99", months: 4),
                                  (id: "developer-stopped-disney", name: "Disney+", domain: "disneyplus.com", cost: "9.99", months: 2)]

    var id: String { "developer-" + rawValue }
    var opensHome: Bool { Self.home.contains(self) }
    var opensInstallment: Bool { Self.installments.contains(self) }

    var title: String {
        switch self {
        case .priceIncrease: "Price goes up · next payment"
        case .priceIncreaseLater: "Price goes up · after next payment"
        case .priceDecrease: "Price goes down · with history"
        case .priceCurrency: "Price change · other currency"
        case .trialEnding: "Free trial ends"
        case .introEnding: "Intro price ends"
        case .offerStarting: "Free trial starts · deferred offer"
        case .licensePurchase: "License · purchase upcoming"
        case .licenseUpdates: "License · included updates end"
        case .licenseRenewed: "License · renewed, updates end again"
        case .active: "Active · no pricing history"
        case .paused: "Paused · resumes"
        case .cancelling: "Cancelling · access ends"
        case .cancelled: "Cancelled · restart"
        case .homeSavingsNone: "Saved row · nothing stopped"
        case .homeSavingsOne: "Saved row · one stopped"
        case .homeSavingsSeveral: "Saved row · three stopped"
        case .homeDecisions: "Needs a decision · six events"
        case .installmentMidPlan: "Installment · mid-plan"
        case .installmentLastTomorrow: "Installment · last payment tomorrow"
        case .installmentPaidOff: "Installment · paid off"
        case .installmentPaidOffEarly: "Loan · paid off early"
        case .installmentMonthEnd: "Installment · 31st, through February"
        }
    }

    var symbol: String {
        switch self {
        case .priceIncrease: "arrow.up.right"
        case .priceIncreaseLater: "calendar.badge.clock"
        case .priceDecrease: "arrow.down.right"
        case .priceCurrency: "arrow.left.arrow.right"
        case .trialEnding: "hourglass"
        case .introEnding, .offerStarting: "tag"
        case .licensePurchase, .licenseUpdates, .licenseRenewed: "key"
        case .active: "checkmark.circle"
        case .paused: "pause.circle"
        case .cancelling: "clock.badge.xmark"
        case .cancelled: "xmark.circle"
        case .homeSavingsNone, .homeSavingsOne, .homeSavingsSeveral: "chart.line.downtrend.xyaxis"
        case .homeDecisions: "exclamationmark.circle"
        case .installmentMidPlan: "creditcard"
        case .installmentLastTomorrow: "flag.checkered"
        case .installmentPaidOff, .installmentPaidOffEarly: "checkmark.seal"
        case .installmentMonthEnd: "calendar.badge.exclamationmark"
        }
    }

    // Deleting first drops phases a previous visit added, so every open starts from the same state.
    func seed(_ repository: SubscriptionRepository) async throws {
        let now = Date(), today = Day.today()
        if let plan = installment(now: now, today: today) {
            let preferences = try await repository.document().preferences
            try await repository.importArchive(JSONCodec.encode(StoreDocument(preferences: preferences, installments: [plan])))
            return
        }
        let members: [Self] = switch self {
        case .homeSavingsNone: []
        case .homeSavingsOne, .homeSavingsSeveral: [.cancelled]
        case .homeDecisions: [.priceIncrease, .trialEnding, .introEnding, .licenseUpdates, .paused, .cancelling]
        default: [self]
        }
        var subscriptions: [Subscription] = [], phases: [PricePhase] = []
        for member in members {
            guard let fixture = member.fixture(now: now, today: today) else { continue }
            subscriptions.append(fixture.subscription); phases += fixture.phases
        }
        if self == .homeSavingsSeveral {
            subscriptions += Self.stopped.map { stopped in
                var subscription = Subscription(id: stopped.id, name: stopped.name, cost: stopped.cost, currency: "usd",
                                                paymentDate: Day.iso(Day.month(today, offset: -stopped.months - 3)), now: now, brandDomain: stopped.domain)
                subscription.createdAt = Day.iso(Day.month(today, offset: -12))
                subscription.willBeCancelledAt = Day.iso(Day.month(today, offset: -stopped.months)); subscription.status = .cancelled
                return subscription
            }
        }
        let removed = [Self.homeSavingsNone, .homeSavingsOne, .homeSavingsSeveral].contains(self) ? [Self.cancelled.id] + Self.stopped.map(\.id) : members.map(\.id)
        // An archive import also writes `prefs`; carry the current ones so a scenario never switches the preferred currency.
        let preferences = try await repository.document().preferences
        for id in removed { try await repository.deleteSubscription(id: id) }
        if !subscriptions.isEmpty {
            try await repository.importArchive(JSONCodec.encode(StoreDocument(preferences: preferences, subscriptions: subscriptions, phases: phases)))
        }
    }

    private func fixture(now: Date, today: Date) -> (subscription: Subscription, phases: [PricePhase])? {
        guard let name else { return nil }
        var subscription = Subscription(id: id, name: name, cost: "11.99", currency: "usd",
                                        paymentDate: Day.iso(Day.shift(today, days: 14)), now: now, brandDomain: domain)
        // Savings never count days before a subscription was entered, so a fixture entered today would show none.
        subscription.createdAt = Day.iso(Day.month(today, offset: -9))
        func phase(_ kind: PhaseKind, _ cost: String, from start: Date, to end: Date? = nil, applied: Bool = true, currency: String = "usd") -> PricePhase {
            PricePhase(id: id + "-" + kind.rawValue + "-" + Day.key(start), subscriptionId: id, kind: kind, cost: cost, currency: currency,
                       startsAt: Day.iso(start), endsAt: end.map(Day.iso), appliedAt: applied ? Day.iso(start) : nil, now: now)
        }
        let renewal = Day.shift(today, days: 14)
        var phases: [PricePhase] = []
        switch self {
        case .priceIncrease:
            phases = [phase(.scheduledChange, "15.00", from: renewal, applied: false)]
        case .priceIncreaseLater:
            phases = [phase(.scheduledChange, "15.00", from: Day.utc.date(byAdding: .month, value: 1, to: renewal)!, applied: false)]
        case .priceDecrease:
            subscription.cost = "14.99"
            phases = [phase(.standard, "9.99", from: Day.month(today, offset: -8), to: Day.month(today, offset: -3)),
                      phase(.scheduledChange, "14.99", from: Day.month(today, offset: -3)),
                      phase(.scheduledChange, "11.99", from: renewal, applied: false)]
        case .priceCurrency:
            phases = [phase(.scheduledChange, "13.50", from: renewal, applied: false, currency: "eur")]
        case .trialEnding:
            subscription.cost = "0"
            phases = [phase(.trial, "0", from: Day.shift(today, days: -16), to: renewal),
                      phase(.standard, "11.99", from: renewal, applied: false)]
        case .introEnding:
            subscription.cost = "4.99"
            phases = [phase(.intro, "4.99", from: Day.month(today, offset: -2), to: renewal),
                      phase(.standard, "11.99", from: renewal, applied: false)]
        case .offerStarting:
            let revert = Day.utc.date(byAdding: .month, value: 3, to: renewal)!
            phases = [phase(.trial, "0", from: renewal, to: revert, applied: false),
                      phase(.standard, "11.99", from: revert, applied: false)]
        case .licensePurchase, .licenseUpdates, .licenseRenewed:
            // Built by the editor's own rule, so each fixture is exactly what saving a license that many years ago stores.
            let years = self == .licensePurchase ? 0 : self == .licenseUpdates ? -1 : -2
            subscription.period = .year; subscription.paymentDate = Day.iso(Day.utc.date(byAdding: .year, value: years, to: renewal)!)
            phases = (try? Pricing.license(subscription: &subscription, licenseCost: "29.00", renewalCost: "19.00", currency: "usd",
                                           now: now, ids: (id + "-license", id + "-renewal"))) ?? []
        case .paused:
            subscription.pausedAt = Day.iso(Day.shift(today, days: -4)); subscription.resumeAt = Day.iso(Day.shift(today, days: 10)); subscription.status = .paused
        case .cancelling:
            subscription.willBeCancelledAt = subscription.paymentDate; subscription.status = .cancelling
        case .cancelled:
            subscription.paymentDate = Day.iso(Day.month(today, offset: -6))
            subscription.willBeCancelledAt = Day.iso(Day.shift(today, days: -12)); subscription.status = .cancelled
        case .active, .homeSavingsNone, .homeSavingsOne, .homeSavingsSeveral, .homeDecisions,
             .installmentMidPlan, .installmentLastTomorrow, .installmentPaidOff, .installmentPaidOffEarly, .installmentMonthEnd:
            break
        }
        return (subscription, phases)
    }

    private func installment(now: Date, today: Date) -> InstallmentPlan? {
        func months(_ offset: Int, from days: Int) -> Date { Day.utc.date(byAdding: .month, value: offset, to: Day.shift(today, days: days))! }
        func plan(_ name: String, kind: InstallmentKind, symbol: String, tint: String, currency: String, total: Decimal, count: Int,
                  every: Int = 1, period: BillingPeriod = .month, first: Date, lender: (name: String, domain: String)? = nil) -> InstallmentPlan {
            var value = InstallmentPlan(id: id, name: name, kind: kind, symbol: symbol, tint: tint, currency: currency, total: Money.canonical(total),
                                        payment: Money.canonical(Installments.regularPayment(total: total, count: count)!), paymentCount: count,
                                        every: every, period: period, firstPaymentDate: Day.iso(first), now: now)
            value.lenderName = lender?.name; value.lenderDomain = lender?.domain
            // Entered before its first payment, so the paid-off scenarios count as plans SubEye watched through.
            value.createdAt = Day.iso(Day.shift(first, days: -1))
            return value
        }
        switch self {
        case .installmentMidPlan:
            return plan("iPhone 17 Pro", kind: .payInParts, symbol: "iphone", tint: "blue", currency: "uah", total: 59999, count: 6,
                        first: months(-3, from: 5), lender: ("monobank", "monobank.ua"))
        case .installmentLastTomorrow:
            return plan("Sofa", kind: .payInParts, symbol: "sofa.fill", tint: "orange", currency: "eur", total: 480, count: 4, every: 2, period: .week,
                        first: Day.shift(today, days: -41), lender: ("Klarna", "klarna.com"))
        case .installmentPaidOff:
            var value = plan("MacBook Air", kind: .cardInstallment, symbol: "laptopcomputer", tint: "purple", currency: "usd", total: 1199, count: 3,
                             first: months(-2, from: -5), lender: ("PrivatBank", "privatbank.ua"))
            value.price = "1099.00"
            return value
        case .installmentPaidOffEarly:
            var value = plan("Car loan", kind: .loan, symbol: "car.fill", tint: "teal", currency: "usd", total: 6000, count: 12,
                             first: months(-6, from: 3))
            let payoff = Day.shift(today, days: -10)
            value.paidOffAt = Day.iso(payoff); value.payoffAmount = Money.canonical(Installments.remaining(value, on: payoff)); value.price = "5400.00"
            return value
        case .installmentMonthEnd:
            let year = Day.utc.component(.year, from: today)
            return plan("Washing machine", kind: .payInParts, symbol: "washer.fill", tint: "green", currency: "uah", total: 24000, count: 12,
                        first: Day.utc.date(from: DateComponents(year: year, month: 1, day: 31))!, lender: ("PUMB", "pumb.ua"))
        default:
            return nil
        }
    }

    private var name: String? {
        switch self {
        case .priceIncrease, .active: "Strava"
        case .priceIncreaseLater: "Notion"
        case .priceDecrease, .paused: "Spotify"
        case .priceCurrency, .cancelling: "Netflix"
        case .trialEnding, .cancelled: "Headspace"
        case .introEnding: "YouTube Premium"
        case .offerStarting: "Duolingo"
        case .licensePurchase: "Sketch"
        case .licenseUpdates: "CleanShot X"
        case .licenseRenewed: "Nova"
        case .homeSavingsNone, .homeSavingsOne, .homeSavingsSeveral, .homeDecisions: nil
        case .installmentMidPlan, .installmentLastTomorrow, .installmentPaidOff, .installmentPaidOffEarly, .installmentMonthEnd: nil
        }
    }

    private var domain: String {
        switch name {
        case "Strava": "strava.com"
        case "Notion": "notion.so"
        case "Spotify": "spotify.com"
        case "Netflix": "netflix.com"
        case "Headspace": "headspace.com"
        case "YouTube Premium": "youtube.com"
        case "CleanShot X": "cleanshot.com"
        case "Sketch": "sketch.com"
        case "Nova": "nova.app"
        default: "duolingo.com"
        }
    }
}

enum DeveloperTextSize: String, CaseIterable {
    static let key = "developer.textSize"
    case system, xxxLarge, accessibility3, accessibility5

    var size: DynamicTypeSize? {
        switch self {
        case .system: nil
        case .xxxLarge: .xxxLarge
        case .accessibility3: .accessibility3
        case .accessibility5: .accessibility5
        }
    }

    var title: String {
        switch self {
        case .system: "System"
        case .xxxLarge: "XXXL"
        case .accessibility3: "AX3"
        case .accessibility5: "AX5 · largest"
        }
    }
}

// The id makes every flip a new task, so switching back to a value set earlier still persists.
// Reminders write the real setting rather than an override, so the Notifications screen and this switch never disagree.
struct DeveloperOverride: Equatable {
    static let pro = "developer.proOverride"
    static let reminders = "notifications.settings"
    let key: String
    let value: Bool
    let id = UUID()

    @MainActor static func binding(_ key: String, state: Binding<SceneState>, change: Binding<DeveloperOverride?>) -> Binding<Bool> {
        Binding(get: {
            let reminders = state.wrappedValue.settings.reminders
            return key == pro ? state.wrappedValue.settings.pro : reminders.renewals || reminders.trials || reminders.installments
        }, set: { value in
            if key == pro { state.wrappedValue.settings.pro = value }
            else {
                state.wrappedValue.settings.reminders.renewals = value; state.wrappedValue.settings.reminders.trials = value
                state.wrappedValue.settings.reminders.installments = value
            }
            change.wrappedValue = DeveloperOverride(key: key, value: value)
        })
    }
}

extension View {
    func developerOverride(_ change: DeveloperOverride?, state: Binding<SceneState>, services: AppServices) -> some View {
        task(id: change) {
            guard let change else { return }
            do {
                if change.key == DeveloperOverride.pro { try await services.repository.setSetting(change.key, value: change.value) }
                else { try await services.repository.setSetting(change.key, value: state.wrappedValue.settings.reminders) }
                state.wrappedValue.reload += 1
            } catch { state.wrappedValue.notice = Notice(title: L("native_error"), message: Display.error(error)) }
        }
    }
}

struct DeveloperScenarioScreen: View {
    let scenario: DeveloperScenario
    @Binding var state: SceneState
    let services: AppServices
    @Binding var sheet: SheetRoute?
    let openHome: () -> Void
    @State private var prepared: DeveloperScenario?
    @State private var change: DeveloperOverride?
    var body: some View {
        Group {
            if prepared == scenario, scenario.opensInstallment { InstallmentDetail(id: scenario.id, state: $state, services: services, sheet: $sheet) }
            else if prepared == scenario, !scenario.opensHome { SubscriptionDetail(id: scenario.id, state: $state, services: services, sheet: $sheet) }
            else { ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity).appScreen() }
        }
        .toolbar {
            if prepared == scenario, !scenario.opensHome {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Toggle(isOn: DeveloperOverride.binding(DeveloperOverride.pro, state: $state, change: $change)) { Label("Pro features", systemImage: "sparkles") }
                            .accessibilityIdentifier("overridePro")
                        Toggle(isOn: DeveloperOverride.binding(DeveloperOverride.reminders, state: $state, change: $change)) { Label("Reminders on", systemImage: "bell") }
                            .accessibilityIdentifier("overrideReminders")
                    } label: { Label("Developer overrides", systemImage: "hammer") }.tint(AppTheme.text).accessibilityIdentifier("developerOverrides")
                }
            }
        }
        .developerOverride(change, state: $state, services: services)
        // Returning from a pushed screen must not reseed, or the state being previewed would reset under it.
        // A deep link replaces the path in place and keeps this view's state, hence the scenario key.
        .task(id: scenario) {
            guard prepared != scenario else { return }
            do {
                try await scenario.seed(services.repository)
                let next = try await services.refresh()
                state.presentation = next.presentation; state.settings = next.settings
                prepared = scenario
                if scenario.opensHome { openHome() }
            } catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
        }
    }
}
#endif
