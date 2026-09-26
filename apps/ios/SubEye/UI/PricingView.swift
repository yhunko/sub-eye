import SwiftUI
import SubEyeCore

struct PricingView: View {
    private enum Field: Hashable { case price, standard }
    @FocusState private var focusedField: Field?
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
    @State private var deferred = true
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
            KeyboardAwareScrollView(focusedField: focusedField) {
                VStack(alignment: .leading, spacing: 24) {
                    SubscriptionIdentity(subscription: row.subscription, logos: services.logos)
                    AppSection(title: L("native_priceChangeType")) {
                        SheetChoice(title: L("native_scheduled"), subtitle: L("native_scheduledHint"), selected: !temporary) { temporary = false }
                            .accessibilityIdentifier("scheduledPriceMode")
                        AppDivider(inset: 16)
                        SheetChoice(title: L("native_temporary"), subtitle: L("native_temporaryHint"), selected: temporary) { temporary = true }
                            .accessibilityIdentifier("temporaryPriceMode")
                    }
                    AppSection(title: L(temporary ? "form_offerCost" : "pricing_newPrice"), footnote: temporary ? L("native_freePriceHint") : nil) {
                        FormField(title: currency.uppercased()) {
                            TextField("0", text: $cost).focused($focusedField, equals: .price).id(Field.price).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                                .accessibilityLabel(L(temporary ? "form_offerCost" : "pricing_newPrice") + ", " + currency.uppercased())
                                .accessibilityIdentifier("newPhasePrice")
                        }
                        AppDivider(inset: 16)
                        NavigationLink { CurrencyPicker(selection: $currency) } label: { SettingsRow(title: L("form_currency"), value: currency.uppercased()) }.buttonStyle(.plain)
                        if temporary {
                            AppDivider(inset: 16)
                            FormField(title: L("pricing_standardCost")) {
                                TextField("0", text: $standard).focused($focusedField, equals: .standard).id(Field.standard).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                                    .accessibilityLabel(L("pricing_standardCost") + ", " + currency.uppercased())
                                    .accessibilityIdentifier("standardPhasePrice")
                            }
                        }
                    }
                    if temporary {
                        AppSection(title: L("pricing_offerStarts")) {
                            SheetChoice(title: L("pricing_startNextPayment"), subtitle: nextOfferDate.map { Display.date($0) }, selected: deferred) { deferred = true }
                                .accessibilityIdentifier("offerNextPayment")
                            AppDivider(inset: 16)
                            SheetChoice(title: L("pricing_startNow"), subtitle: L("pricing_startNowHint"), selected: !deferred) { deferred = false }
                                .accessibilityIdentifier("offerStartsNow")
                        }
                        AppSection(title: L("pricing_offerLength")) {
                            Stepper(value: $payments, in: 1...120) {
                                Text(String(payments)).monospacedDigit()
                            }.padding(16).accessibilityLabel(L("pricing_offerLength"))
                                .accessibilityValue(String(payments)).accessibilityIdentifier("offerPaymentCount")
                        }
                    } else {
                        AppSection(title: L("pricing_effectiveFrom")) {
                            SheetChoice(title: L("pricing_effectiveNextOccurrence"), subtitle: scheduledDate.map { Display.date($0) }, selected: !custom) { custom = false }
                                .accessibilityIdentifier("priceNextPayment")
                            AppDivider(inset: 16)
                            SheetChoice(title: L("pricing_effectiveCustomDate"), selected: custom) { custom = true }
                                .accessibilityIdentifier("priceCustomDate")
                            if custom {
                                AppDivider(inset: 16)
                                DatePicker(L("native_date"), selection: $date, in: Day.shift(Day.today(), days: 1)..., displayedComponents: .date)
                                    .environment(\.timeZone, .gmt).padding(16)
                            }
                        }
                    }
                    if let summary {
                        AppSection(title: L("pricing_summaryTitle")) {
                            Text(summary).appFont(15).fixedSize(horizontal: false, vertical: true).padding(16)
                                .accessibilityIdentifier("pricingSummary")
                        }
                    }
                    if row.effectiveKind == .trial || row.effectiveKind == .intro, let revert = row.upcoming {
                        ActionButton(title: L("native_endOffer")) {
                            try await services.repository.managePhase(subscriptionId: row.id, phaseId: revert.id, apply: true, now: Date()); state.reload += 1; dismiss()
                        }.appFont(15).frame(maxWidth: .infinity, minHeight: 44)
                    }
                }.appFont(16).padding(20)
            }.appScreen().navigationTitle(L("pricing_title"))
                .toolbar {
                    ToolbarItemGroup(placement: .keyboard) {
                        if temporary && focusedField == .price {
                            Button(L("common_next")) { focusedField = .standard }.accessibilityIdentifier("nextPricingField")
                        }
                        Button(L("common_done")) { focusedField = nil }.accessibilityIdentifier("dismissPricingKeyboard")
                    }
                    ToolbarItem(placement: .cancellationAction) { SheetCloseButton() }
                    ToolbarItem(placement: .confirmationAction) {
                        ActionButton(title: L("form_save"), action: save)
                            .accessibilityIdentifier("savePricing")
                            .disabled(Money.parse(cost) == nil || (temporary && Money.parse(standard) == nil))
                    }
                }
        }.appSheet()
    }
    private var nextOfferDate: Date? {
        let zone = TimeZone(identifier: state.presentation.preferences.preferredTimezone) ?? .current
        return Recurrence.next(row.subscription, onOrAfter: Day.today(Date(), zone: zone))
    }
    private func formatted(_ value: String, currency: String) -> String {
        Display.money(NSDecimalNumber(decimal: Money.parse(value) ?? 0).doubleValue, currency)
    }
    private var summary: String? {
        guard Money.parse(cost) != nil else { return nil }
        if temporary {
            guard Money.parse(standard) != nil else { return nil }
            var subscription = row.subscription
            let zone = TimeZone(identifier: state.presentation.preferences.preferredTimezone) ?? .current
            guard let phases = try? Pricing.offer(subscription: &subscription, promoCost: cost, standardCost: standard,
                currency: currency, payments: payments, endDate: nil, deferred: deferred, now: Date(), zone: zone, ids: ("preview-offer", "preview-standard")),
                let start = phases.first.flatMap({ Day.parse($0.startsAt) }),
                let end = phases.last.flatMap({ Day.parse($0.startsAt) }) else { return nil }
            return L("native_offerSummary", ["price": formatted(cost, currency: currency), "start": Display.date(start),
                "standard": formatted(standard, currency: currency), "end": Display.date(end)])
        }
        guard let effective = custom ? date : scheduledDate else { return nil }
        return L("pricing_summaryChange", ["date": Display.date(effective), "to": formatted(cost, currency: currency),
            "from": formatted(row.subscription.cost, currency: row.subscription.currency)])
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
