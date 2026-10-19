#if NATIVE_DEVELOPMENT
import SwiftUI
import SubEyeCore

enum DeveloperScenario: String, CaseIterable, Hashable {
    case priceIncrease, priceDecrease, priceCurrency, trialEnding, introEnding, offerStarting
    case active, paused, cancelling, cancelled

    static let pricing: [Self] = [.priceIncrease, .priceDecrease, .priceCurrency, .trialEnding, .introEnding, .offerStarting]
    static let lifecycle: [Self] = [.active, .paused, .cancelling, .cancelled]

    var id: String { "developer-" + rawValue }

    var title: String {
        switch self {
        case .priceIncrease: "Price goes up · next payment"
        case .priceDecrease: "Price goes down · with history"
        case .priceCurrency: "Price change · other currency"
        case .trialEnding: "Free trial ends"
        case .introEnding: "Intro price ends"
        case .offerStarting: "Free trial starts · deferred offer"
        case .active: "Active · no pricing history"
        case .paused: "Paused · resumes"
        case .cancelling: "Cancelling · access ends"
        case .cancelled: "Cancelled · restart"
        }
    }

    var symbol: String {
        switch self {
        case .priceIncrease: "arrow.up.right"
        case .priceDecrease: "arrow.down.right"
        case .priceCurrency: "arrow.left.arrow.right"
        case .trialEnding: "hourglass"
        case .introEnding, .offerStarting: "tag"
        case .active: "checkmark.circle"
        case .paused: "pause.circle"
        case .cancelling: "clock.badge.xmark"
        case .cancelled: "xmark.circle"
        }
    }

    // Deleting first drops phases a previous visit added, so every open starts from the same state.
    func seed(_ repository: SubscriptionRepository) async throws {
        let now = Date(), today = Day.today()
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
            let revert = Day.month(renewal, offset: 3)
            phases = [phase(.trial, "0", from: renewal, to: revert, applied: false),
                      phase(.standard, "11.99", from: revert, applied: false)]
        case .active:
            break
        case .paused:
            subscription.pausedAt = Day.iso(Day.shift(today, days: -4)); subscription.resumeAt = Day.iso(Day.shift(today, days: 10)); subscription.status = .paused
        case .cancelling:
            subscription.willBeCancelledAt = subscription.paymentDate; subscription.status = .cancelling
        case .cancelled:
            subscription.paymentDate = Day.iso(Day.month(today, offset: -6))
            subscription.willBeCancelledAt = Day.iso(Day.shift(today, days: -12)); subscription.status = .cancelled
        }
        // An archive import also writes `prefs`; carry the current ones so a scenario never switches the preferred currency.
        let preferences = try await repository.document().preferences
        try await repository.deleteSubscription(id: id)
        try await repository.importArchive(JSONCodec.encode(StoreDocument(preferences: preferences, subscriptions: [subscription], phases: phases)))
    }

    static func clear(_ repository: SubscriptionRepository) async throws {
        for scenario in allCases { try await repository.deleteSubscription(id: scenario.id) }
    }

    private var name: String {
        switch self {
        case .priceIncrease, .active: "Strava"
        case .priceDecrease, .paused: "Spotify"
        case .priceCurrency, .cancelling: "Netflix"
        case .trialEnding, .cancelled: "Headspace"
        case .introEnding: "YouTube Premium"
        case .offerStarting: "Duolingo"
        }
    }

    private var domain: String {
        switch name {
        case "Strava": "strava.com"
        case "Spotify": "spotify.com"
        case "Netflix": "netflix.com"
        case "Headspace": "headspace.com"
        case "YouTube Premium": "youtube.com"
        default: "duolingo.com"
        }
    }
}

struct DeveloperScenarioScreen: View {
    let scenario: DeveloperScenario
    @Binding var state: SceneState
    let services: AppServices
    @Binding var sheet: SheetRoute?
    @State private var prepared: DeveloperScenario?
    var body: some View {
        Group {
            if prepared == scenario { SubscriptionDetail(id: scenario.id, state: $state, services: services, sheet: $sheet) }
            else { ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity).appScreen() }
        }
        // Returning from a pushed screen must not reseed, or the state being previewed would reset under it.
        // A deep link replaces the path in place and keeps this view's state, hence the scenario key.
        .task(id: scenario) {
            guard prepared != scenario else { return }
            do {
                try await scenario.seed(services.repository)
                let next = try await services.refresh()
                state.presentation = next.presentation; state.settings = next.settings
                prepared = scenario
            } catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
        }
    }
}
#endif
