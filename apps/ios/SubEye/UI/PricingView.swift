import SwiftUI
import SubEyeCore

struct PricingView: View {
    let row: SubscriptionRow
    @Binding var state: SceneState
    let services: AppServices
    @Environment(\.dismiss) private var dismiss
    @State private var temporary = false
    @State private var cost = ""
    @State private var standard = ""
    @State private var currency: String
    @State private var custom = false
    @State private var date = Day.shift(Day.today(), days: 1)
    @State private var payments = 3
    @State private var deferred = false
    private var scheduledDate: Date? {
        let zone = TimeZone(identifier: state.presentation.preferences.preferredTimezone) ?? .current
        return (try? Pricing.scheduled(row.subscription, cost: "0", currency: currency, on: nil, now: Date(), zone: zone, id: "preview")).flatMap { Day.parse($0.startsAt) }
    }
    init(row: SubscriptionRow, state: Binding<SceneState>, services: AppServices) {
        self.row = row; _state = state; self.services = services
        _currency = State(initialValue: row.subscription.currency); _standard = State(initialValue: row.subscription.cost)
    }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    HStack(spacing: 12) {
                        BrandIcon(name: row.subscription.name, domain: row.subscription.brandDomain, logos: services.logos)
                        Text(row.subscription.name).appFont(15, weight: .semibold)
                    }
                    Picker(L("pricing_title"), selection: $temporary) {
                        Text(L("native_scheduled")).tag(false); Text(L("native_temporary")).tag(true)
                    }.pickerStyle(.segmented)
                    VStack(alignment: .leading, spacing: 8) {
                        Text(L("pricing_newPrice")).appFont(13, weight: .semibold).foregroundStyle(AppTheme.muted)
                        FormField(title: L("pricing_newPrice")) {
                            TextField("0", text: $cost).keyboardType(.decimalPad).multilineTextAlignment(.trailing).accessibilityIdentifier("newPhasePrice")
                        }.appCard(radius: 16)
                        Text(L("pricing_wasPrice", ["price": Display.money(NSDecimalNumber(decimal: Money.parse(row.subscription.cost) ?? 0).doubleValue, row.subscription.currency)])).appFont(13).foregroundStyle(AppTheme.muted)
                    }
                    AppSection {
                        NavigationLink { CurrencyPicker(selection: $currency) } label: { SettingsRow(title: L("form_currency"), value: currency.uppercased()) }.buttonStyle(.plain)
                        if temporary {
                            AppDivider(inset: 16)
                            FormField(title: L("pricing_standardCost")) { TextField("0", text: $standard).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                            AppDivider(inset: 16)
                            Stepper(L("native_paymentCount") + ": " + String(payments), value: $payments, in: 1...120).padding(16)
                            AppDivider(inset: 16)
                            Toggle(L("native_startNext"), isOn: $deferred).padding(16)
                        } else {
                            AppDivider(inset: 16)
                            Toggle(L("native_customDate"), isOn: $custom).padding(16)
                            AppDivider(inset: 16)
                            if custom { DatePicker(L("native_date"), selection: $date, in: Day.shift(Day.today(), days: 1)..., displayedComponents: .date).environment(\.timeZone, .gmt).padding(16) }
                            else if let next = scheduledDate { SettingsRow(title: L("detail_nextPayment"), value: Display.date(next), chevron: false) }
                        }
                    }
                    ActionButton(title: L("form_save"), action: save).buttonStyle(AppPrimaryButtonStyle())
                        .disabled(Money.parse(cost) == nil || (temporary && Money.parse(standard) == nil))
                    if row.effectiveKind == .trial || row.effectiveKind == .intro, let revert = row.upcoming {
                        ActionButton(title: L("native_endOffer")) {
                            try await services.repository.managePhase(subscriptionId: row.id, phaseId: revert.id, apply: true, now: Date()); state.reload += 1; dismiss()
                        }.appFont(15).frame(maxWidth: .infinity, minHeight: 44)
                    }
                }.appFont(16).padding(20)
            }.appScreen().navigationTitle(L("pricing_title"))
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button { dismiss() } label: { Label(L("common_cancel"), systemImage: "xmark") }.tint(AppTheme.text) } }
        }
    }
    private func save() async throws {
        let price = try Display.amount(cost)
        if temporary {
            let offer = OfferInput(promoCost: price, standardCost: try Display.amount(standard), currency: currency, payments: payments, deferred: deferred)
            try await services.repository.startOffer(id: row.id, offer: offer, now: Date())
        } else {
            try await services.repository.schedulePrice(id: row.id, cost: price, currency: currency, date: custom ? Day.floor(date) : nil, now: Date())
        }
        state.reload += 1; dismiss()
    }
}
