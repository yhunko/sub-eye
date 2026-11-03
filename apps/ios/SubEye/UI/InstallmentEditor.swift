import SwiftUI
import SubEyeCore

struct InstallmentEditor: View {
    enum Term: Hashable, CaseIterable { case total, count, payment }
    struct Terms: Equatable {
        var total = "", count = "", payment = ""
        var derived: Term?
        subscript(term: Term) -> String {
            get { switch term { case .total: total; case .count: count; case .payment: payment } }
            set { switch term { case .total: total = newValue; case .count: count = newValue; case .payment: payment = newValue } }
        }
    }
    private enum Field: Hashable { case name, term(Term), price, notes }
    @FocusState private var focusedField: Field?
    let original: InstallmentPlan?
    @Binding var state: SceneState
    let services: AppServices
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var draft: InstallmentPlan
    @State private var entry: Terms
    @State private var price: String
    @State private var date: Date
    @State private var atPurchase: Bool
    @State private var variant = "auto"
    @State private var initialVariant = "auto"
    @State private var remindersOffer = false
    @State private var saved = false
    @State private var paywall = false
    private let initial: InstallmentPlan
    private let initialEntry: Terms
    private let creationDay: Date
    // A plan written by a later build can carry terms this editor cannot express; they are shown, never coerced.
    private let lockedTerms: Bool

    init(original: InstallmentPlan?, state: Binding<SceneState>, services: AppServices) {
        self.original = original; _state = state; self.services = services
        let initial = original ?? InstallmentPlan(id: UUID().uuidString, name: "", symbol: InstallmentStyle.defaultSymbol, tint: InstallmentStyle.tints[0].token,
                                                  currency: state.wrappedValue.presentation.preferences.preferredCurrency, total: "", payment: "", paymentCount: 0,
                                                  firstPaymentDate: Day.iso(Day.today()), now: Date())
        self.initial = initial
        creationDay = Self.creationDay(original: original, zone: .current, now: Date())
        lockedTerms = original.map { !Installments.editorAccepts(every: $0.every, period: $0.period, count: $0.paymentCount) } ?? false
        _draft = State(initialValue: initial)
        initialEntry = Terms(total: initial.total, count: initial.paymentCount > 0 ? String(initial.paymentCount) : "", payment: initial.payment)
        _entry = State(initialValue: initialEntry)
        _price = State(initialValue: initial.price ?? "")
        _date = State(initialValue: Day.parse(initial.firstPaymentDate).map(Day.floor) ?? Day.today())
        _atPurchase = State(initialValue: original.map { $0.paidAtPurchase == true } ?? true)
    }

    // An edited plan's creation day is the day it was created where the device is now, as the first payment date picker shows it.
    static func creationDay(original: InstallmentPlan?, zone: TimeZone, now: Date) -> Date {
        Day.today(original.flatMap { Day.parse($0.createdAt) } ?? now, zone: zone)
    }

    // Two of total, count and payment fix the third, but only a field that is empty or holds the previous derivation is
    // recomputed: a value the user typed is never overwritten, and with all three typed nothing is derived.
    static func enter(_ value: String, in term: Term, _ terms: Terms) -> Terms {
        var next = terms
        next[term] = value
        if next.derived == term { next.derived = nil }
        let open = Term.allCases.filter { $0 != term && (next[$0].trimmingCharacters(in: .whitespaces).isEmpty || $0 == next.derived) }
        guard open.count == 1, let target = open.first else { return next }
        let total = parse(next.total), payment = parse(next.payment), count = Int(next.count.trimmingCharacters(in: .whitespaces))
        switch target {
        case .payment:
            next.payment = total.flatMap { total in count.flatMap { $0 > 0 ? Installments.regularPayment(total: total, count: $0) : nil } }.map(Money.canonical) ?? ""
        case .total:
            next.total = payment.flatMap { payment in count.map { Money.canonical(payment * Decimal($0)) } } ?? ""
        case .count:
            next.count = total.flatMap { total in payment.flatMap { payment -> String? in
                guard payment > 0 else { return nil }
                var exact = total / payment, rounded = Decimal()
                NSDecimalRound(&rounded, &exact, 0, .up)
                return rounded.description
            } } ?? ""
        }
        next.derived = target
        return next
    }

    static func overpayment(_ plan: InstallmentPlan, today: Date) -> (amount: Decimal, share: Double)? {
        guard let price = plan.price.flatMap({ Money.parse($0, below: Installments.ceiling) }), price > 0 else { return nil }
        let amount = Installments.totals(plan, today: today).spent - price
        return amount > 0 ? (amount, NSDecimalNumber(decimal: amount / price).doubleValue) : nil
    }

    static func value(_ draft: InstallmentPlan, total: String, count: Int, payment: String, price: String, firstPayment: Date,
                      atPurchase: Bool, creationDay: Date) throws -> InstallmentPlan {
        var value = draft
        value.name = draft.name.trimmingCharacters(in: .whitespacesAndNewlines)
        value.total = try amount(total, field: "installment_total")
        value.payment = try amount(payment, field: "installment_payment")
        value.paymentCount = count
        value.price = price.trimmingCharacters(in: .whitespaces).isEmpty ? nil : try amount(price, field: "installment_price")
        value.firstPaymentDate = Day.iso(Day.floor(firstPayment))
        value.paidAtPurchase = atPurchase && Day.floor(firstPayment) == Day.floor(creationDay) ? true : nil
        return value
    }
    private static func amount(_ text: String, field: String) throws -> String {
        guard let value = Money.parse(text, below: Installments.ceiling) else { throw DomainError.invalidField(L(field)) }
        return Money.canonical(value)
    }
    private static func parse(_ text: String) -> Decimal? { Money.parse(text, below: Installments.ceiling) }

    private var terms: (total: Decimal, count: Int, payment: Decimal)? {
        guard let total = Self.parse(entry.total), let payment = Self.parse(entry.payment), let count = Int(entry.count.trimmingCharacters(in: .whitespaces)),
              total > 0, payment > 0, Installments.editorAccepts(every: draft.every, period: draft.period, count: count),
              payment * Decimal(count - 1) < total else { return nil }
        return (total, count, payment)
    }
    private var showsAtPurchase: Bool { Day.floor(date) == Day.floor(creationDay) }
    private var priceValid: Bool {
        let price = price.trimmingCharacters(in: .whitespaces)
        return price.isEmpty || (Self.parse(price) ?? 0) > 0
    }
    private var valid: Bool { !draft.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && (lockedTerms || terms != nil) && priceValid }
    private var dirty: Bool {
        draft != initial || entry.total != initialEntry.total || entry.count != initialEntry.count || entry.payment != initialEntry.payment
            || price != (initial.price ?? "") || Day.iso(Day.floor(date)) != initial.firstPaymentDate || atPurchase != (original.map { $0.paidAtPurchase == true } ?? true)
            || variant != initialVariant
    }
    private var uneven: Bool {
        guard entry.payment.isEmpty, let total = Self.parse(entry.total), let count = Int(entry.count), count > 0 else { return false }
        return Installments.regularPayment(total: total, count: count) == nil
    }
    private var biweekly: Bool { draft.every == 2 && draft.period == .week }

    var body: some View {
        NavigationStack {
            KeyboardAwareScrollView(focusedField: focusedField) {
                VStack(spacing: 24) {
                    purpose
                    kindSection
                    lender
                    termsSection
                    priceSection
                    AppSection(title: L("native_notes")) {
                        TextField(L("native_notes"), text: Binding(get: { draft.notes ?? "" }, set: { draft.notes = $0.isEmpty ? nil : $0 }), axis: .vertical)
                            .focused($focusedField, equals: .notes).id(Field.notes).lineLimit(3...8).appFont(16).padding(16)
                    }
                }.padding(20).padding(.bottom, 20)
            }
            .appScreen()
            .safeAreaInset(edge: .bottom, spacing: 0) { footer }
            .navigationTitle(L(original == nil ? "installment_titleNew" : "installment_titleEdit"))
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Button(L("common_done")) { focusedField = nil }.accessibilityIdentifier("dismissEditorKeyboard")
                }
                ToolbarItem(placement: .cancellationAction) { closeEditor }
            }
        }
        .interactiveDismissDisabled(dirty && !saved).appSheet(dismissible: !dirty || saved)
        .sheet(isPresented: $remindersOffer, onDismiss: { dismiss() }) {
            PromptView(prompt: .reminders, state: $state, services: services)
                .environment(\.dynamicTypeSize, typeSize)
        }
        .sheet(isPresented: $paywall) { PaywallView(state: $state, services: services) }
        .task(id: draft.lenderDomain) {
            let saved = if let domain = draft.lenderDomain { await services.logos.variant(for: domain) ?? "auto" } else { "auto" }
            guard !Task.isCancelled else { return }
            initialVariant = saved; variant = saved
        }
    }
    @ViewBuilder private var closeEditor: some View {
        if dirty {
            Menu {
                Section(L("form_discardTitle")) {
                    Button(role: .destructive) { dismiss() } label: { DestructiveMenuLabel(title: L("form_discardConfirm")) }
                }
            } label: { Label(L("common_cancel"), systemImage: "xmark") }
                .labelStyle(.iconOnly).tint(AppTheme.text).accessibilityIdentifier("closeInstallmentEditor")
        } else {
            Button { dismiss() } label: { Label(L("common_cancel"), systemImage: "xmark") }
                .labelStyle(.iconOnly).tint(AppTheme.text).accessibilityIdentifier("closeInstallmentEditor")
        }
    }
    private var purpose: some View {
        let tint = InstallmentStyle.color(draft.tint)
        return AppSection(title: L("installment_sectionWhat")) {
            HStack(spacing: 12) {
                InstallmentIcon(symbol: draft.symbol, tint: draft.tint, lenderName: draft.lenderName, lenderDomain: draft.lenderDomain, logos: services.logos, size: 44, ring: AppTheme.surface)
                TextField(L("form_name"), text: $draft.name).focused($focusedField, equals: .name).id(Field.name).submitLabel(.next)
                    .onSubmit { focusedField = .term(.total) }.appFont(17, weight: .semibold).accessibilityIdentifier("installmentName")
            }.padding(.horizontal, 16).padding(.vertical, 12)
            AppDivider(inset: 16)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 44), spacing: 6)], spacing: 6) {
                ForEach(InstallmentStyle.symbols, id: \.name) { symbol in
                    let selected = draft.symbol == symbol.name
                    Button { draft.symbol = symbol.name } label: {
                        Image(systemName: symbol.name).font(.system(size: 18, weight: .semibold)).foregroundStyle(selected ? tint : AppTheme.muted)
                            .frame(width: 44, height: 44).background(selected ? tint.opacity(0.18) : AppTheme.surfaceAlt, in: Circle())
                            .overlay { Circle().strokeBorder(selected ? tint : .clear, lineWidth: 2) }
                    }.buttonStyle(.plain).accessibilityLabel(L("installment_purpose_" + symbol.purpose))
                        .accessibilityIdentifier("installmentSymbol-" + symbol.purpose).accessibilityAddTraits(selected ? .isSelected : [])
                }
            }.padding(12)
            AppDivider(inset: 16)
            HStack(spacing: 0) {
                ForEach(InstallmentStyle.tints, id: \.token) { item in
                    let selected = draft.tint == item.token
                    Button { draft.tint = item.token } label: {
                        Circle().fill(item.color).frame(width: 26, height: 26).padding(4)
                            .overlay { Circle().strokeBorder(selected ? AppTheme.text : .clear, lineWidth: 2) }
                            .frame(maxWidth: .infinity, minHeight: 44).contentShape(Rectangle())
                    }.buttonStyle(.plain).accessibilityLabel(L("installment_tint_" + item.token)).accessibilityAddTraits(selected ? .isSelected : [])
                }
            }.padding(.horizontal, 8).padding(.vertical, 4)
        }
    }
    private var kindSection: some View {
        AppSection(title: L("installment_kind")) {
            ForEach(Array(InstallmentKind.allCases.enumerated()), id: \.element) { index, kind in
                if index > 0 { AppDivider(inset: 16) }
                SheetChoice(title: L("installment_kind_" + kind.rawValue), selected: draft.installmentKind == kind) { draft.kind = kind.rawValue }
                    .accessibilityIdentifier("installmentKind-" + kind.rawValue)
            }
        }
    }
    private var lender: some View {
        AppSection(title: L("installment_lender")) {
            NavigationLink {
                BrandPicker(services: services, domain: draft.lenderDomain, variant: $variant, popular: BrandService.lenders, title: L("installment_lender"),
                            prompt: L("installment_lenderSearch"), failure: L("installment_lenderSearchFailed")) { selected in
                    draft.lenderName = selected?.name; draft.lenderDomain = selected?.domain
                }
            } label: {
                HStack(spacing: 12) {
                    if let domain = draft.lenderDomain {
                        BrandIcon(name: draft.lenderName ?? domain, domain: domain, logos: services.logos, size: 32, variant: variant)
                    } else { RowIcon(symbol: "building.columns") }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(draft.lenderName ?? L("installment_lenderPick")).appFont(16).foregroundStyle(AppTheme.text)
                        if let domain = draft.lenderDomain { Text(domain).appFont(12.5).foregroundStyle(AppTheme.muted) }
                    }.fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
                    Image(systemName: "chevron.right").appFont(13, weight: .semibold).foregroundStyle(AppTheme.muted).accessibilityHidden(true)
                }.padding(.horizontal, 16).padding(.vertical, 10).frame(minHeight: 56).contentShape(Rectangle())
            }.buttonStyle(.plain).accessibilityIdentifier("installmentLender")
        }
    }
    private var termsSection: some View {
        AppSection(title: L("installment_terms"), footnote: termsNote) {
            FormField(title: L("form_currency")) {
                NavigationLink { CurrencyPicker(selection: $draft.currency) } label: {
                    HStack(spacing: 5) {
                        Text(Display.currencyFlag(draft.currency)).accessibilityHidden(true)
                        Text(draft.currency.uppercased())
                        Image(systemName: "chevron.up.chevron.down").appFont(12, weight: .semibold).foregroundStyle(AppTheme.muted)
                    }.foregroundStyle(AppTheme.text).fixedSize().frame(minHeight: 44)
                }.buttonStyle(.plain).accessibilityLabel(L("form_currency") + ", " + draft.currency.uppercased()).accessibilityIdentifier("currencyPicker")
            }
            AppDivider(inset: 16)
            if lockedTerms {
                FormField(title: L("installment_total")) { Text(money(Self.parse(draft.total) ?? 0)).foregroundStyle(AppTheme.muted) }
                AppDivider(inset: 16)
                FormField(title: L("installment_count")) { Text(String(draft.paymentCount)).foregroundStyle(AppTheme.muted) }
                AppDivider(inset: 16)
                FormField(title: L("installment_payment")) { Text(money(Self.parse(draft.payment) ?? 0)).foregroundStyle(AppTheme.muted) }
                AppDivider(inset: 16)
                FormField(title: L("installment_interval")) {
                    let cadence = Display.cadence(every: draft.every, period: draft.period)
                    Text(cadence.prefix(1).uppercased() + cadence.dropFirst()).foregroundStyle(AppTheme.muted)
                }
            } else {
                amountField(.total, title: L("installment_total"), keyboard: .decimalPad)
                AppDivider(inset: 16)
                amountField(.count, title: L("installment_count"), keyboard: .numberPad)
                AppDivider(inset: 16)
                amountField(.payment, title: L("installment_payment"), keyboard: .decimalPad)
                AppDivider(inset: 16)
                FormField(title: L("installment_interval")) {
                    Menu {
                        Picker(L("installment_interval"), selection: Binding(get: { biweekly }, set: { draft.every = $0 ? 2 : 1; draft.period = $0 ? .week : .month })) {
                            Text(L("form_cycleMonthly")).tag(false)
                            Text(L("form_cycleBiweekly")).tag(true)
                        }.pickerStyle(.inline)
                    } label: {
                        HStack(spacing: 8) {
                            Text(L(biweekly ? "form_cycleBiweekly" : "form_cycleMonthly")).appFont(16).foregroundStyle(AppTheme.text)
                            Image(systemName: "chevron.up.chevron.down").appFont(12, weight: .semibold).foregroundStyle(AppTheme.muted)
                        }.frame(minHeight: 44)
                    }.buttonStyle(.plain).accessibilityIdentifier("installmentInterval")
                        .accessibilityLabel(L("installment_interval") + ", " + L(biweekly ? "form_cycleBiweekly" : "form_cycleMonthly"))
                }
            }
            AppDivider(inset: 16)
            DatePicker(L("form_firstPayment"), selection: $date, displayedComponents: .date).environment(\.timeZone, .gmt)
                .appFont(16).padding(.horizontal, 16).frame(minHeight: 56).accessibilityIdentifier("installmentFirstPayment")
            if showsAtPurchase {
                AppDivider(inset: 16)
                Toggle(L("installment_atPurchase"), isOn: $atPurchase).appFont(16).padding(16).accessibilityIdentifier("installmentAtPurchase")
            }
        }
    }
    private var termsNote: String? {
        if lockedTerms { return L("installment_termsLocked") }
        if uneven { return L("installment_splitUneven") }
        if let terms {
            let last = terms.total - terms.payment * Decimal(terms.count - 1)
            let values = ["payment": money(terms.payment), "count": String(terms.count), "last": money(last), "total": money(terms.total)]
            return L(last == terms.payment ? "installment_summary" : "installment_summaryLast", values)
        }
        guard !Term.allCases.contains(where: { entry[$0].trimmingCharacters(in: .whitespaces).isEmpty }) else { return nil }
        guard let count = Int(entry.count.trimmingCharacters(in: .whitespaces)), Installments.editorAccepts(every: draft.every, period: draft.period, count: count) else {
            return L("installment_countRange")
        }
        guard let total = Self.parse(entry.total), let payment = Self.parse(entry.payment), total > 0, payment > 0 else { return L("installment_amountInvalid") }
        return L("installment_paymentTooHigh")
    }
    private func amountField(_ term: Term, title: String, keyboard: UIKeyboardType) -> some View {
        FormField(title: title) {
            TextField("0", text: Binding(get: { entry[term] }, set: { entry = Self.enter($0, in: term, entry) }))
                .focused($focusedField, equals: .term(term)).id(Field.term(term)).keyboardType(keyboard)
                .multilineTextAlignment(typeSize.isAccessibilitySize ? .leading : .trailing).accessibilityLabel(title)
                .accessibilityIdentifier(term == .total ? "installmentTotal" : term == .count ? "installmentCount" : "installmentPayment")
        }
    }
    private var priceSection: some View {
        AppSection(title: L("installment_price"), footnote: priceNote) {
            if state.settings.pro {
                FormField(title: L("installment_price")) {
                    TextField("0", text: $price).focused($focusedField, equals: .price).id(Field.price).keyboardType(.decimalPad)
                        .multilineTextAlignment(typeSize.isAccessibilitySize ? .leading : .trailing).accessibilityLabel(L("installment_price"))
                        .accessibilityIdentifier("installmentPrice")
                }
            } else {
                Button { paywall = true } label: { SettingsRow(title: L("installment_price"), value: L("paywall_badge")).frame(minHeight: 56) }
                    .buttonStyle(.plain).accessibilityIdentifier("installmentPriceLock")
            }
        }
    }
    private var priceNote: String {
        guard state.settings.pro else { return L("installment_priceHint") }
        guard priceValid else { return L("installment_amountInvalid") }
        let today = Day.today(Date(), zone: TimeZone(identifier: state.presentation.preferences.preferredTimezone) ?? .current)
        guard let plan = try? currentValue(), let overpayment = Self.overpayment(plan, today: today) else { return L("installment_priceHint") }
        return L("installment_overpayment", ["amount": money(overpayment.amount), "percent": overpayment.share.formatted(.percent.precision(.fractionLength(0...1)))])
    }
    private func money(_ value: Decimal) -> String { Display.money(NSDecimalNumber(decimal: value).doubleValue, draft.currency) }
    private var footer: some View {
        VStack(spacing: 0) {
            AppDivider()
            ActionButton(title: L("form_save"), action: save)
                .disabled(!valid || saved).accessibilityIdentifier("saveInstallment")
                .buttonStyle(AppPrimaryButtonStyle()).padding(.horizontal, 20).padding(.top, 14).padding(.bottom, 12)
        }.background(AppTheme.background)
    }
    private func currentValue() throws -> InstallmentPlan {
        if lockedTerms {
            return try Self.value(draft, total: draft.total, count: draft.paymentCount, payment: draft.payment, price: price, firstPayment: date, atPurchase: atPurchase, creationDay: creationDay)
        }
        guard let terms else { throw DomainError.invalidField(L("installment_terms")) }
        return try Self.value(draft, total: entry.total, count: terms.count, payment: entry.payment, price: price, firstPayment: date, atPurchase: atPurchase, creationDay: creationDay)
    }
    private func save() async throws {
        guard !saved else { return }
        focusedField = nil
        let value = try currentValue()
        try await services.repository.saveInstallment(value, expected: original, now: Date())
        saved = true
        if let domain = value.lenderDomain {
            do { try await services.logos.setVariant(variant, for: domain) }
            catch { state.notice = Notice(title: L("native_error"), message: L("installment_logoSaveFailed")) }
        }
        if original == nil {
            let permission = await services.notifications.permission()
            remindersOffer = (try? await services.prompts.afterCreation(settings: state.settings,
                permissionAllowsNotifications: permission == .authorized || permission == .provisional || permission == .ephemeral)) ?? false
        }
        state.reload += 1
        if !remindersOffer { dismiss() }
    }
}
