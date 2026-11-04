import SwiftUI
import SubEyeCore

struct SubscriptionEditor: View {
    enum Flow: String { case subscription, trial, license }
    enum Offer: Equatable { case none, intro(price: String, ends: Date), trial(ends: Date), license(price: String) }
    private enum Page: Hashable { case brand, terms, brandPicker }
    private enum Field: Hashable { case name, price, offerPrice, notes }
    @FocusState private var focusedField: Field?
    let original: Subscription?
    let flow: Flow
    @Binding var state: SceneState
    let services: AppServices
    let onExisting: @MainActor (SubscriptionRow, LifecycleAction?) -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var draft: Subscription
    @State private var date: Date
    @State private var steps: [Page] = []
    @State private var intro = false
    @State private var offerPrice = ""
    @State private var offerEnd: Date
    @State private var remindersOffer = false
    @State private var saved = false
    @State private var paywall = false
    @State private var variant = "auto"
    @State private var initialVariant = "auto"
    @State private var search = ""
    @State private var brands = BrandService.popular
    @State private var searchFailed = false
    private let initial: Subscription
    // Held in state: recomputed on every init, the default would move at midnight and mark an untouched page as changed.
    @State private var initialOfferEnd: Date

    init(original: Subscription?, flow: Flow = .subscription, state: Binding<SceneState>, services: AppServices,
         onExisting: @escaping @MainActor (SubscriptionRow, LifecycleAction?) -> Void) {
        self.original = original; self.flow = flow; _state = state; self.services = services; self.onExisting = onExisting
        var initial = original ?? Subscription(id: UUID().uuidString, name: "", cost: "", currency: state.wrappedValue.presentation.preferences.preferredCurrency, paymentDate: Day.iso(Day.today()), now: Date())
        if original == nil, flow == .license { initial.period = .year }
        self.initial = initial; _draft = State(initialValue: initial); _date = State(initialValue: Day.parse(initial.paymentDate) ?? Day.today())
        let end = Day.shift(Day.today(), days: 7); _initialOfferEnd = State(initialValue: end); _offerEnd = State(initialValue: end)
    }

    // The footnote key for the first rule the terms break, or nil. An empty or unparsable price is no rule: Save just waits.
    static func rejection(_ draft: Subscription, firstPayment: Date, offer: Offer, now: Date, zone: TimeZone = .current) -> String? {
        switch offer {
        case .intro(let promo, let ends):
            guard let promo = Money.parse(promo), let price = Money.parse(draft.cost) else { return nil }
            if promo == 0 { return "form_introFree" }
            if promo >= price { return "form_introTooHigh" }
            // Core sets the subscription's cost to the promo whatever the end, so an intro that discounts no charge is refused here.
            let anchor = Day.floor(firstPayment), end = Day.floor(ends)
            let index = Recurrence.nextIndex(anchor: anchor, every: draft.every, period: draft.period, onOrAfter: Day.today(now, zone: zone))
            if Recurrence.occurrence(anchor: anchor, every: draft.every, period: draft.period, index: index) >= end { return "form_introEndEarly" }
            return end > now ? nil : "form_endTooSoon"
        case .trial(let ends):
            if Money.parse(draft.cost) == 0 { return "form_priceAboveZero" }
            return Day.floor(ends) > now ? nil : "form_endTooSoon"
        case .license(let price):
            return Money.parse(price) == 0 || Money.parse(draft.cost) == 0 ? "form_priceAboveZero" : nil
        default:
            return nil
        }
    }

    // `draft.cost` is the recurring price; an offer's first or one-off price travels in the `Offer`.
    static func value(_ draft: Subscription, firstPayment: Date, offer: Offer, now: Date, zone: TimeZone = .current) throws
        -> (subscription: Subscription, offer: OfferInput?) {
        if let rejection = rejection(draft, firstPayment: firstPayment, offer: offer, now: now, zone: zone) { throw DomainError.invalidField(L(rejection)) }
        var value = draft
        value.name = draft.name.trimmingCharacters(in: .whitespacesAndNewlines)
        value.cost = try Display.amount(draft.cost)
        value.paymentDate = Day.iso(Day.floor(firstPayment))
        switch offer {
        case .none:
            return (value, nil)
        case .intro(let price, let ends):
            return (value, OfferInput(promoCost: try Display.amount(price), standardCost: value.cost, currency: value.currency, endDate: Day.floor(ends)))
        case .trial(let ends):
            // Charges fall on the anchor's cycle, so a trial anchored on its start would first charge a whole cycle later.
            value.paymentDate = Day.iso(Day.floor(ends))
            return (value, OfferInput(promoCost: "0", standardCost: value.cost, currency: value.currency, endDate: Day.floor(ends)))
        case .license(let price):
            return (value, OfferInput(promoCost: try Display.amount(price), standardCost: value.cost, currency: value.currency, license: true))
        }
    }
    private var dirty: Bool {
        draft != initial || Day.iso(date) != initial.paymentDate || variant != initialVariant
            || intro || !offerPrice.isEmpty || offerEnd != initialOfferEnd
    }
    private var valid: Bool { !draft.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && Money.parse(draft.cost) != nil }
    private var termsValid: Bool {
        switch terms {
        case .intro(let price, _), .license(let price): Money.parse(price) != nil
        default: true
        }
    }
    private var terms: Offer {
        guard original == nil else { return .none }
        switch flow {
        case .trial: return .trial(ends: offerEnd)
        case .license: return .license(price: offerPrice)
        case .subscription: return intro ? .intro(price: offerPrice, ends: offerEnd) : .none
        }
    }
    private var zone: TimeZone { TimeZone(identifier: state.presentation.preferences.preferredTimezone) ?? .current }
    private var rejection: String? { valid ? Self.rejection(draft, firstPayment: date, offer: terms, now: Date(), zone: zone) : nil }
    private var root: Page { original == nil ? .brand : .terms }
    var body: some View {
        NavigationStack(path: $steps) {
            editorPage(root)
                .navigationDestination(for: Page.self) { page in
                    if page == .brandPicker {
                        BrandPicker(services: services, domain: draft.brandDomain, variant: $variant) { selected in
                            draft.brandDomain = selected?.domain
                            if draft.name.isEmpty, let selected { draft.name = selected.name }
                        }
                    } else {
                        editorPage(page)
                    }
                }
        }
        .interactiveDismissDisabled(dirty && !saved).appSheet(dismissible: !dirty || saved)
        .sheet(isPresented: $remindersOffer, onDismiss: { dismiss() }) {
            PromptView(prompt: .reminders, state: $state, services: services)
                .environment(\.dynamicTypeSize, typeSize)
        }
        .sheet(isPresented: $paywall) { PaywallView(state: $state, services: services) }
        .onChange(of: date) { _ in if intro { offerEnd = max(offerEnd, introEarliestEnd) } }
        .task(id: draft.brandDomain) {
            let saved = if let domain = draft.brandDomain { await services.logos.variant(for: domain) ?? "auto" } else { "auto" }
            guard !Task.isCancelled else { return }
            initialVariant = saved; variant = saved
        }
    }
    private func heading(_ page: Page) -> (step: Int, total: Int, title: String)? {
        guard original == nil else { return nil }
        switch page {
        case .brand: return (1, 2, L("form_brand"))
        case .terms: return (2, 2, L(flow == .trial ? "form_stepTrial" : flow == .license ? "form_stepLicense" : "form_stepPrice"))
        case .brandPicker: return nil
        }
    }
    private func editorPage(_ page: Page) -> some View {
        Group {
            if page == .brand { brandStep.searchable(text: $search, placement: .navigationBarDrawer(displayMode: .always), prompt: L("form_brandSearch")) }
            else {
                KeyboardAwareScrollView(focusedField: focusedField) {
                    VStack(spacing: 24) {
                        if let heading = heading(page) { stepHeading(heading.step, of: heading.total, title: heading.title) }
                        switch original == nil ? flow : .subscription {
                        case .subscription: subscriptionContent
                        case .trial: trialContent
                        case .license: licenseContent
                        }
                    }.padding(20).padding(.bottom, 20)
                }
            }
        }
        .appScreen()
        .safeAreaInset(edge: .bottom, spacing: 0) { footer(page) }
        .navigationTitle(L(original != nil ? "form_titleEdit" : flow == .trial ? "form_titleTrial" : flow == .license ? "form_titleLicense" : "form_titleNew"))
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                if focusedField == .name {
                    Button(L("common_next")) { focusedField = nameNext }.accessibilityIdentifier("nextEditorField")
                }
                Button(L("common_done")) { focusedField = nil }.accessibilityIdentifier("dismissEditorKeyboard")
            }
            ToolbarItem(placement: page == root ? .cancellationAction : .topBarTrailing) {
                closeEditor
            }
        }
        .task(id: search) {
            guard page == .brand else { return }
            do {
                if search.isEmpty { brands = BrandService.popular; searchFailed = false; return }
                try await Task.sleep(for: .milliseconds(300))
                brands = try await services.brands.search(search); searchFailed = false
            } catch is CancellationError { } catch { brands = BrandService.popular.filter { $0.name.localizedStandardContains(search) }; searchFailed = true }
        }
    }
    @ViewBuilder private var closeEditor: some View {
        if dirty {
            Menu {
                Section(L("form_discardTitle")) {
                    Button(role: .destructive) { dismiss() } label: {
                        DestructiveMenuLabel(title: L("form_discardConfirm"))
                    }
                }
            } label: { Label(L("common_cancel"), systemImage: "xmark") }
                .labelStyle(.iconOnly).tint(AppTheme.text).accessibilityIdentifier("closeSubscriptionEditor")
        } else {
            Button { dismiss() } label: { Label(L("common_cancel"), systemImage: "xmark") }
                .labelStyle(.iconOnly).tint(AppTheme.text).accessibilityIdentifier("closeSubscriptionEditor")
        }
    }
    private func stepHeading(_ step: Int, of total: Int, title: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) { ForEach(1...total, id: \.self) { index in Capsule().fill(index <= step ? AppTheme.accent : AppTheme.surfaceAlt).frame(height: 4) } }.accessibilityHidden(true)
            Text(L("form_stepOf", ["step": String(step), "total": String(total)]) + " · " + title)
                .appFont(13).foregroundStyle(AppTheme.muted)
        }
    }
    private var brandStep: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 10) {
                if let heading = heading(.brand) { stepHeading(heading.step, of: heading.total, title: heading.title).padding(.horizontal, 4).padding(.bottom, 6) }
                if draft.brandDomain != nil { brandIdentity }
                if let domain = draft.brandDomain { BrandStylePicker(domain: domain, selection: $variant, logos: services.logos) }
                Button {
                    draft.brandDomain = nil
                } label: { SettingsRow(icon: "square.dashed", title: L("form_brandNone"), chevron: false).appCard(radius: 18) }.buttonStyle(.plain)
                if let domain = BrandService.normalizeDomain(search) {
                    Button(L("form_brandUse", ["domain": domain])) { draft.brandDomain = domain; if draft.name.isEmpty { draft.name = domain } }.frame(minHeight: 44)
                }
                AppCaption(title: L(search.isEmpty ? "form_brandPopular" : "form_brandResults")).padding(.horizontal, 4).padding(.top, 12)
                ForEach(brands) { item in
                    Button {
                        draft.brandDomain = item.domain
                        draft.name = item.name
                    } label: {
                        BrandOption(brand: item, selected: draft.brandDomain == item.domain, logos: services.logos, variant: draft.brandDomain == item.domain ? variant : nil)
                    }.buttonStyle(.plain).accessibilityIdentifier("brand-" + item.domain)
                }
                if searchFailed { Text(L("form_brandSearchFailed")).appFont(12.5).foregroundStyle(AppTheme.muted) }
            }.padding(.horizontal, 16).padding(.vertical, 16)
        }.scrollDismissesKeyboard(.interactively)
    }
    private var brandIdentity: some View {
        HStack(spacing: 12) {
            BrandIcon(name: draft.name, domain: draft.brandDomain, logos: services.logos, size: 36, variant: variant)
            VStack(alignment: .leading, spacing: 2) {
                Text(draft.name.isEmpty ? L("form_brandNone") : draft.name).appFont(16, weight: .semibold)
                if let domain = draft.brandDomain { Text(domain).appFont(12.5).foregroundStyle(AppTheme.muted) }
            }.frame(maxWidth: .infinity, alignment: .leading)
            GlassIconButton(title: L("form_brandChange"), icon: "pencil") { focusedField = nil; steps.append(.brandPicker) }
                .accessibilityIdentifier("subscriptionBrand")
        }.padding(.horizontal, 14).padding(.vertical, 12)
            .background { BrandWash(domain: draft.brandDomain, logos: services.logos, variant: variant) }
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay { RoundedRectangle(cornerRadius: 20).strokeBorder(Color.white.opacity(0.16), lineWidth: 1) }
    }
    @ViewBuilder private var subscriptionContent: some View {
        brandIdentity
        AppSection {
            nameField(next: nameNext)
            AppDivider(inset: 16)
            priceField(title: L("form_price"), text: $draft.cost, focus: .price, identifier: "subscriptionPrice")
            AppDivider(inset: 16)
            categoryRow
        }
        CadenceField(every: $draft.every, period: $draft.period)
        AppSection {
            dateRow(title: L("form_firstPayment"), selection: $date, identifier: "firstPayment")
        }
        if original == nil { introCard }
        advancedSection
        if original == nil, intro, !plan.isEmpty { planPreview(plan) }
    }
    @ViewBuilder private var trialContent: some View {
        brandIdentity
        AppSection(footnote: L("form_trialEndsHint")) {
            dateRow(title: L("form_trialEnds"), selection: $offerEnd, range: earliestEnd..., identifier: "trialEnd")
        }
        AppSection {
            nameField(next: nameNext)
            AppDivider(inset: 16)
            priceField(title: L("form_trialPrice"), text: $draft.cost, focus: .price, identifier: "subscriptionPrice")
            AppDivider(inset: 16)
            categoryRow
        }
        CadenceField(every: $draft.every, period: $draft.period)
        advancedSection
        if !plan.isEmpty { planPreview(plan) }
    }
    @ViewBuilder private var licenseContent: some View {
        brandIdentity
        AppSection {
            nameField(next: nameNext)
            AppDivider(inset: 16)
            priceField(title: L("form_licensePrice"), text: $offerPrice, focus: .offerPrice, identifier: "licensePrice")
            AppDivider(inset: 16)
            categoryRow
        }
        AppSection {
            dateRow(title: L("form_purchaseDate"), selection: $date, identifier: "purchaseDate")
        }
        CadenceField(every: $draft.every, period: $draft.period, title: L("form_updatesCycle"))
        AppSection(footnote: L("form_renewalHint")) {
            FormField(title: L("form_updatesUntil")) { Text(Display.date(nextCycle)).foregroundStyle(AppTheme.muted) }
            AppDivider(inset: 16)
            amountField(title: L("form_renewalCost"), text: $draft.cost, focus: .price, identifier: "renewalPrice")
        }
        advancedSection
        if !plan.isEmpty { planPreview(plan) }
    }
    // Core keeps an offer only if it ends after the save instant, and its end is a UTC midnight.
    private var earliestEnd: Date { Day.shift(Day.floor(Date()), days: 1) }
    private var nameNext: Field { original == nil && flow == .license ? .offerPrice : .price }
    private func nameField(next: Field) -> some View {
        FormField(title: L("form_name")) {
            TextField(L("form_name"), text: $draft.name).focused($focusedField, equals: .name).id(Field.name).submitLabel(.next).onSubmit { focusedField = next }.textContentType(.organizationName).multilineTextAlignment(typeSize.isAccessibilitySize ? .leading : .trailing).accessibilityIdentifier("subscriptionName")
        }
    }
    private func amountInput(title: String, text: Binding<String>, focus: Field, identifier: String) -> some View {
        TextField("0", text: text).focused($focusedField, equals: focus).id(focus).keyboardType(.decimalPad).multilineTextAlignment(typeSize.isAccessibilitySize ? .leading : .trailing).accessibilityLabel(title).accessibilityIdentifier(identifier)
    }
    private func amountField(title: String, text: Binding<String>, focus: Field, identifier: String) -> some View {
        FormField(title: title) { amountInput(title: title, text: text, focus: focus, identifier: identifier) }
    }
    private func priceField(title: String, text: Binding<String>, focus: Field, identifier: String) -> some View {
        FormField(title: title) {
            HStack(spacing: 8) {
                amountInput(title: title, text: text, focus: focus, identifier: identifier)
                Rectangle().fill(AppTheme.border).frame(width: 1, height: 24).accessibilityHidden(true)
                NavigationLink { CurrencyPicker(selection: $draft.currency) } label: {
                    HStack(spacing: 5) {
                        Text(Display.currencyFlag(draft.currency)).accessibilityHidden(true)
                        Text(draft.currency.uppercased())
                        Image(systemName: "chevron.up.chevron.down").appFont(12, weight: .semibold).foregroundStyle(AppTheme.muted)
                    }.foregroundStyle(AppTheme.text).fixedSize().frame(minHeight: 44).padding(.leading, 4)
                }.buttonStyle(.plain).accessibilityLabel(L("form_currency") + ", " + draft.currency.uppercased()).accessibilityIdentifier("currencyPicker")
            }
        }
    }
    @ViewBuilder private var categoryRow: some View {
        if state.settings.pro {
            NavigationLink {
                CategoryPicker(selection: $draft.categoryId, state: $state, services: services)
            } label: {
                SettingsRow(title: L("form_category"), value: state.presentation.categories.first(where: { $0.id == draft.categoryId }).map { $0.emoji + " " + $0.name } ?? L("form_categoryNone")).frame(minHeight: 56)
            }.buttonStyle(.plain).accessibilityIdentifier("categoryPicker")
        } else {
            Button { paywall = true } label: { SettingsRow(title: L("form_category"), value: L("paywall_badge")).frame(minHeight: 56) }.buttonStyle(.plain)
        }
    }
    private func dateRow(title: String, selection: Binding<Date>, range: PartialRangeFrom<Date> = Date.distantPast..., identifier: String) -> some View {
        DatePicker(title, selection: selection, in: range, displayedComponents: .date).environment(\.timeZone, .gmt).appFont(16).padding(.horizontal, 16).frame(minHeight: 56)
            .accessibilityIdentifier(identifier)
    }
    private var advancedSection: some View {
        DisclosureGroup(L("native_advanced")) {
            AppSection {
                Toggle(L("native_autoPaid"), isOn: $draft.autoPaid).padding(16)
                AppDivider(inset: 16)
                TextField(L("native_notes"), text: Binding(get: { draft.notes ?? "" }, set: { draft.notes = $0.isEmpty ? nil : $0 }), axis: .vertical).focused($focusedField, equals: .notes).id(Field.notes).lineLimit(3...8).padding(16)
            }.padding(.top, 12)
        }.appFont(14).foregroundStyle(AppTheme.muted)
    }
    private var introCard: some View {
        let locked = !state.settings.pro
        var traits: AccessibilityTraits = intro ? .isSelected : []
        if #available(iOS 17, *), !locked { traits.formUnion(.isToggle) }
        return VStack(spacing: 0) {
            Button {
                if locked { paywall = true }
                else {
                    intro.toggle()
                    if intro { offerEnd = max(offerEnd, introEarliestEnd) }
                }
            } label: {
                HStack(spacing: 14) {
                    RowIcon(symbol: "tag", color: intro ? AppTheme.accentBright : AppTheme.muted)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(L("form_intro")).appFont(16, weight: .semibold)
                        Text(L("form_introHint")).appFont(13).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                    Image(systemName: locked ? "lock" : intro ? "checkmark.circle.fill" : "circle")
                        .appFont(22).foregroundStyle(intro ? AppTheme.accentBright : AppTheme.muted)
                }.padding(16).contentShape(Rectangle())
            }.buttonStyle(.plain).accessibilityIdentifier("introOffer").accessibilityAddTraits(traits)
                .accessibilityValue(locked ? L("paywall_badge") : "")
            if intro {
                AppDivider(inset: 16)
                amountField(title: L("form_offerCost"), text: $offerPrice, focus: .offerPrice, identifier: "offerPrice")
            }
            // Built with the page and only revealed: a compact picker inserted into a page already on screen settles on its short
            // "11/11/26" style, unlike every other date row.
            VStack(spacing: 0) {
                AppDivider(inset: 16)
                dateRow(title: L("form_offerEndsAt"), selection: $offerEnd, range: introEarliestEnd..., identifier: "offerEnd")
            }.frame(height: intro ? nil : 0, alignment: .top).clipped().opacity(intro ? 1 : 0).accessibilityHidden(!intro).disabled(!intro)
        }.appCard(radius: 18, border: intro ? AppTheme.accent : AppTheme.border)
            .animation(reduceMotion ? nil : .easeInOut(duration: 0.22), value: intro)
    }
    private var introEarliestEnd: Date { max(Day.shift(Day.floor(date), days: 1), earliestEnd) }
    // A license includes updates for exactly one cycle, the window `Pricing.license` stores.
    private var nextCycle: Date { Recurrence.occurrence(anchor: Day.floor(date), every: draft.every, period: draft.period, index: 1) }
    private var plan: [(title: String, date: Date, note: String?, amount: String)] { Self.plan(draft, firstPayment: date, offer: terms) }
    static func plan(_ draft: Subscription, firstPayment: Date, offer: Offer) -> [(title: String, date: Date, note: String?, amount: String)] {
        guard Money.parse(draft.cost) != nil else { return [] }
        func money(_ text: String) -> String { Money.parse(text).map { Display.money(NSDecimalNumber(decimal: $0).doubleValue, draft.currency) } ?? "—" }
        let first = Day.floor(firstPayment), price = money(draft.cost), then = L("form_planThen", ["cadence": Display.cadence(draft)])
        func charge(_ index: Int) -> Date { Recurrence.occurrence(anchor: first, every: draft.every, period: draft.period, index: index) }
        switch offer {
        case .none:
            return []
        case .trial(let ends):
            return [(L("form_offerTrial"), first, nil, L("pricing_free")), (then, Day.floor(ends), nil, price)]
        case .intro(let promo, let ends):
            // The intro ends on a picked day, but the full price starts with the first charge on or after it.
            let full = charge(Recurrence.nextIndex(anchor: first, every: draft.every, period: draft.period, onOrAfter: Day.floor(ends)))
            return [(L("native_phase_intro"), first, nil, money(promo)), (then, full, nil, price)]
        case .license(let license):
            return [(L("form_offerLicense"), first, nil, money(license)),
                    (L("form_planUpdatesEnd"), charge(1), L("form_planRenewal", ["cadence": Display.cadence(draft)]), price)]
        }
    }
    private func planPreview(_ steps: [(title: String, date: Date, note: String?, amount: String)]) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            AppCaption(title: L("form_summaryTitle"))
            VStack(alignment: .leading, spacing: 0) {
                ForEach(steps.indices, id: \.self) { index in
                    let step = steps[index], last = index == steps.count - 1
                    HStack(alignment: .top, spacing: 12) {
                        VStack(spacing: 4) {
                            Circle().fill(index == 0 ? AppTheme.accentBright : AppTheme.surfaceAlt)
                                .overlay { Circle().strokeBorder(AppTheme.accentBright, lineWidth: 2) }.frame(width: 11, height: 11).padding(.top, 5)
                            if !last { Capsule().fill(AppTheme.border).frame(width: 2).frame(maxHeight: .infinity) }
                        }.accessibilityHidden(true)
                        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4)) : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 12))
                        layout {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(step.title).appFont(15, weight: .semibold)
                                Text(([Display.date(step.date)] + [step.note].compactMap { $0 }).joined(separator: " · ")).appFont(13).foregroundStyle(AppTheme.muted)
                            }.frame(maxWidth: .infinity, alignment: .leading)
                            Text(step.amount).appFont(15, weight: .semibold).monospacedDigit()
                        }.fixedSize(horizontal: false, vertical: true).padding(.bottom, last ? 0 : 18)
                    }.fixedSize(horizontal: false, vertical: true).accessibilityElement(children: .combine)
                }
            }
        }.frame(maxWidth: .infinity, alignment: .leading).padding(16).appCard(radius: 18, fill: AppTheme.surfaceAlt, border: .clear)
            .accessibilityIdentifier("planPreview")
    }
    private func footer(_ page: Page) -> some View {
        let saves = page == .terms
        return VStack(spacing: 0) {
            AppDivider()
            if original == nil, let existing = Lifecycle.counterpart(name: draft.name, domain: draft.brandDomain, in: state.presentation.rows) {
                existingBanner(existing).padding(.horizontal, 20).padding(.top, 14)
            }
            if saves, let rejection {
                Text(L(rejection)).appFont(13).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 20).padding(.top, 12).accessibilityIdentifier("saveBlocked")
            }
            Group {
                if saves {
                    ActionButton(title: L("form_save"), action: save)
                        .disabled(!valid || !termsValid || rejection != nil || saved).accessibilityIdentifier("saveSubscription")
                } else {
                    Button(L(page == .brand && draft.brandDomain == nil ? "common_skip" : "common_next")) {
                        focusedField = nil; steps.append(.terms)
                    }.accessibilityIdentifier("nextSubscriptionStep")
                }
            }.buttonStyle(AppPrimaryButtonStyle()).padding(.horizontal, 20).padding(.top, 14).padding(.bottom, 12)
        }.background(AppTheme.background)
    }
    private func existingBanner(_ row: SubscriptionRow) -> some View {
        let action: LifecycleAction? = row.status == .paused ? .resume : row.status == .cancelled ? .restart : nil
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 10)) : AnyLayout(HStackLayout(spacing: 12))
        return layout {
            HStack(spacing: 12) {
                BrandIcon(name: row.subscription.name, domain: row.subscription.brandDomain, logos: services.logos, size: 32, dimmed: row.status == .cancelled)
                VStack(alignment: .leading, spacing: 2) {
                    Text(L("form_existingTitle", ["name": row.subscription.name])).appFont(14, weight: .semibold)
                    Text([L("subs_status_" + row.status.rawValue), Display.money(NSDecimalNumber(decimal: Money.parse(row.subscription.cost) ?? 0).doubleValue, row.subscription.currency), Display.cadence(row.subscription)].joined(separator: " · "))
                        .appFont(12.5).foregroundStyle(AppTheme.muted)
                }.fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
            }.accessibilityElement(children: .combine)
            Button(L(action.map { "native_action_" + $0.rawValue } ?? "form_existingOpen")) { focusedField = nil; onExisting(row, action) }
                .appFont(14, weight: .semibold).buttonStyle(.bordered).buttonBorderShape(.capsule).tint(AppTheme.accentBright)
                .accessibilityIdentifier("existingSubscription")
        }.padding(12).appCard(radius: 16, fill: AppTheme.rowFill(row.status), border: AppTheme.rowBorder(row.status))
    }
    private func save() async throws {
        guard !saved else { return }
        focusedField = nil
        let (value, offerInput) = try Self.value(draft, firstPayment: date, offer: terms, now: Date(), zone: zone)
        try await services.repository.save(value, expected: original, offer: offerInput, rates: try await services.exchange.cached(), now: Date())
        saved = true
        if let domain = value.brandDomain {
            do { try await services.logos.setVariant(variant, for: domain) }
            catch { state.notice = Notice(title: L("native_error"), message: L("native_logoSaveFailed")) }
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

struct CadenceField: View {
    @Binding var every: Int
    @Binding var period: BillingPeriod
    var title = L("form_cycle")
    @State private var custom: Bool?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @ScaledMetric private var wheelHeight: CGFloat = 180
    private let presets: [(key: String, every: Int, period: BillingPeriod)] = [
        ("Daily", 1, .day), ("Weekly", 1, .week), ("Biweekly", 2, .week),
        ("Monthly", 1, .month), ("Quarterly", 3, .month), ("Semiannual", 6, .month), ("Yearly", 1, .year)
    ]
    private var matched: String? { presets.first { $0.every == every && $0.period == period }?.key }
    private var showsCustom: Bool { custom ?? (matched == nil) }
    private var choice: Binding<String> {
        Binding(get: { showsCustom ? "Custom" : matched ?? "Custom" }, set: { next in
            if next == "Custom" { custom = true }
            else if let preset = presets.first(where: { $0.key == next }) { custom = false; every = preset.every; period = preset.period }
        })
    }
    var body: some View {
        AppSection {
            FormField(title: title) {
                Menu {
                    Picker(title, selection: choice) {
                        ForEach(presets, id: \.key) { Text(L("form_cycle" + $0.key)).tag($0.key) }
                        Text(L("form_cycleCustom")).tag("Custom")
                    }.pickerStyle(.inline)
                } label: {
                    HStack(spacing: 8) {
                        Text(L("form_cycle" + choice.wrappedValue)).appFont(16).foregroundStyle(AppTheme.text)
                        Image(systemName: "chevron.up.chevron.down").appFont(12, weight: .semibold).foregroundStyle(AppTheme.muted)
                    }.frame(minHeight: 44)
                }.buttonStyle(.plain).accessibilityIdentifier("billingCycle")
                    .accessibilityLabel(title + ", " + L("form_cycle" + choice.wrappedValue))
            }
            if showsCustom {
                AppDivider(inset: 16)
                FormField(title: L("form_every")) {
                    HStack(spacing: 0) {
                        Picker(L("form_every"), selection: $every) {
                            ForEach(Array(1...60) + (every > 60 ? [every] : []), id: \.self) { Text(String($0)).tag($0) }
                        }.frame(maxWidth: .infinity).clipped().accessibilityIdentifier("cadenceCount")
                        Picker(title, selection: $period) {
                            Text(L("unit_days")).tag(BillingPeriod.day)
                            Text(L("unit_weeks")).tag(BillingPeriod.week)
                            Text(L("unit_months")).tag(BillingPeriod.month)
                            Text(L("unit_years")).tag(BillingPeriod.year)
                        }.frame(maxWidth: .infinity).clipped().accessibilityIdentifier("cadenceUnit")
                    }.pickerStyle(.wheel).labelsHidden().frame(height: min(360, wheelHeight)).clipped()
                }
            }
        }.clipped().animation(reduceMotion ? nil : .easeInOut(duration: 0.22), value: showsCustom)
    }
}

struct CurrencyPicker: View {
    @Binding var selection: String
    var onSelect: (@MainActor (String) async throws -> Void)? = nil
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var query = ""
    @State private var currencies: [String] = []
    @State private var suggested: [String] = []
    @State private var pending: String?
    @State private var error: String?
    private var sections: [(String, [String])] {
        let needle = query.trimmingCharacters(in: .whitespacesAndNewlines)
        let matches = currencies.filter { needle.isEmpty || $0.localizedStandardContains(needle) || name($0).localizedStandardContains(needle) }
        if !needle.isEmpty { return matches.isEmpty ? [] : [("", matches)] }
        let groups = Dictionary(grouping: matches) { String($0.prefix(1)).uppercased() }
        return [(L("currency_suggested"), suggested)] + groups.keys.sorted().map { ($0, groups[$0]!) }
    }
    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                if sections.isEmpty { Text(L("currency_noResults")).appFont(14).foregroundStyle(AppTheme.muted).frame(maxWidth: .infinity).padding(.top, 24) }
                ForEach(sections, id: \.0) { section in
                    VStack(alignment: .leading, spacing: 6) {
                        if !section.0.isEmpty { AppCaption(title: section.0).padding(.horizontal, 16) }
                        VStack(spacing: 0) {
                            ForEach(Array(section.1.enumerated()), id: \.element) { index, code in
                                if index > 0 { AppDivider(inset: 58) }
                                Button { pending = code } label: { currencyRow(code) }.buttonStyle(.plain)
                                    .accessibilityIdentifier("currency-" + code).accessibilityAddTraits(selection == code ? .isSelected : [])
                            }
                        }.background(AppTheme.surface).clipShape(RoundedRectangle(cornerRadius: 18))
                    }
                }
            }.padding(.horizontal, 16).padding(.bottom, 24)
        }.scrollDismissesKeyboard(.interactively).appScreen().navigationTitle(L("form_currency"))
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: L("currency_search"))
            .disabled(pending != nil)
            .task {
                guard currencies.isEmpty, let url = Bundle.main.url(forResource: "currencies", withExtension: "json"), let bytes = try? Data(contentsOf: url) else { return }
                currencies = ((try? JSONCodec.decode([String].self, bytes)) ?? []).sorted()
                var seen = Set<String>()
                suggested = ([selection.lowercased(), Locale.current.currency?.identifier.lowercased() ?? ""] + ["usd", "eur", "gbp", "uah", "pln", "chf", "jpy", "cad", "aud"]).filter { currencies.contains($0) && seen.insert($0).inserted }
            }
            .task(id: pending) {
                guard let pending else { return }
                do { try await onSelect?(pending); selection = pending; dismiss() }
                catch { self.pending = nil; self.error = Display.error(error) }
            }
            .alert(L("native_error"), isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) { Button(L("common_done")) { error = nil } } message: { Text(error ?? "") }
    }
    private func name(_ code: String) -> String { Locale.current.localizedString(forCurrencyCode: code.uppercased()) ?? code.uppercased() }
    private func currencyRow(_ code: String) -> some View {
        HStack(spacing: 12) {
            Text(Display.currencyFlag(code)).font(.system(size: 25)).frame(width: 30).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 1) {
                Text(code.uppercased()).appFont(16, weight: selection == code ? .semibold : .regular).foregroundStyle(selection == code ? AppTheme.accentBright : AppTheme.text)
                Text(name(code)).appFont(12.5).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true)
            }.frame(maxWidth: .infinity, alignment: .leading)
            if !typeSize.isAccessibilitySize, let symbol = Display.currencySymbol(code) { Text(symbol).appFont(15).foregroundStyle(AppTheme.muted).accessibilityHidden(true) }
            Image(systemName: selection == code ? "checkmark.circle.fill" : "circle").appFont(21).foregroundStyle(selection == code ? AppTheme.accentBright : AppTheme.border).accessibilityHidden(true)
        }.padding(.horizontal, 16).padding(.vertical, 9).frame(minHeight: 52)
            .background(selection == code ? AppTheme.accent.opacity(0.14) : .clear).contentShape(Rectangle())
    }
}

struct BrandPicker: View {
    let services: AppServices
    let domain: String?
    @Binding var variant: String
    var popular = BrandService.popular
    var title = L("form_brand")
    var prompt = L("form_brandSearch")
    var failure = L("form_brandSearchFailed")
    let select: (Brand?) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""
    @State private var brands: [Brand]?
    @State private var failed = false
    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 10) {
                if let domain { BrandStylePicker(domain: domain, selection: $variant, logos: services.logos) }
                Button { select(nil); dismiss() } label: {
                    SettingsRow(icon: "square.dashed", title: L("form_brandNone"), chevron: false).appCard(radius: 18)
                }.buttonStyle(.plain)
                if let domain = BrandService.normalizeDomain(search) {
                    Button(L("form_brandUse", ["domain": domain])) { select(Brand(name: domain, domain: domain)); dismiss() }.frame(minHeight: 44)
                }
                AppCaption(title: L(search.isEmpty ? "form_brandPopular" : "form_brandResults")).padding(.horizontal, 4).padding(.top, 12)
                ForEach(brands ?? popular) { brand in
                    Button { select(brand); dismiss() } label: { BrandOption(brand: brand, selected: domain == brand.domain, logos: services.logos, variant: domain == brand.domain ? variant : nil) }.buttonStyle(.plain)
                }
                if failed { Text(failure).appFont(12.5).foregroundStyle(AppTheme.muted) }
            }.padding(16)
        }.scrollDismissesKeyboard(.interactively).appScreen().searchable(text: $search, placement: .navigationBarDrawer(displayMode: .always), prompt: prompt)
                .navigationTitle(title)
                .task(id: search) {
                    do {
                        // The service answers a one-letter query with its own popular list, which is the subscription one.
                        if search.count < 2 { brands = popular; failed = false; return }
                        try await Task.sleep(for: .milliseconds(300))
                        brands = try await services.brands.search(search); failed = false
                    } catch is CancellationError { } catch { brands = popular.filter { $0.name.localizedStandardContains(search) }; failed = true }
                }
    }
}

private struct BrandStylePicker: View {
    let domain: String
    @Binding var selection: String
    let logos: LogoService
    @State private var previews: [Preview]?
    private struct Preview: Identifiable, Sendable {
        let id: String
        let payload: LogoPayload
    }
    private let styles = ["icon", "symbol", "logo"]
    var body: some View {
        Group {
        if previews?.isEmpty != true {
            AppSection(title: L("form_brandStyle")) {
                HStack(alignment: .top, spacing: 10) {
                    if let previews {
                        ForEach(previews) { preview in
                            let selected = selection == preview.id || (selection == "auto" && preview.id == previews.first?.id)
                            Button { selection = preview.id } label: {
                                VStack(spacing: 6) {
                                    Group {
                                        if let bytes = preview.payload.bytes, let image = UIImage(data: bytes) {
                                            Image(uiImage: image).resizable().scaledToFit().padding(preview.payload.plate ? 0 : 8)
                                        }
                                    }.frame(width: 52, height: 52).background(AppTheme.surfaceAlt, in: Circle()).clipShape(Circle())
                                        .padding(4).overlay { Circle().strokeBorder(selected ? AppTheme.accentBright : .clear, lineWidth: 2) }
                                    Text(L(preview.id == "icon" ? "native_logoIcon" : preview.id == "symbol" ? "native_logoSymbol" : "native_logoWordmark"))
                                        .appFont(12.5).foregroundStyle(selected ? AppTheme.text : AppTheme.muted).fixedSize(horizontal: false, vertical: true)
                                }.frame(maxWidth: .infinity)
                            }.buttonStyle(.plain).accessibilityIdentifier("brandStyle-" + preview.id).accessibilityAddTraits(selected ? .isSelected : [])
                        }
                    } else {
                        ForEach(styles, id: \.self) { _ in
                            Circle().fill(AppTheme.surfaceAlt).frame(width: 60, height: 60).frame(maxWidth: .infinity).padding(.bottom, 22)
                        }
                    }
                }.padding(12)
            }
        }
        }.task(id: domain) {
                previews = nil
                let found = await withTaskGroup(of: Preview?.self) { group in
                    for style in styles {
                        group.addTask {
                            guard let payload = await logos.preview(domain: domain, variant: style), payload.bytes != nil else { return nil }
                            return Preview(id: style, payload: payload)
                        }
                    }
                    var results: [Preview] = []
                    for await item in group { if let item { results.append(item) } }
                    return results
                }
                guard !Task.isCancelled else { return }
                var seen = Set<Data>()
                previews = styles.compactMap { style in found.first { $0.id == style } }
                    .filter { preview in preview.payload.bytes.map { seen.insert($0).inserted } ?? false }
        }
    }
}

private struct BrandOption: View {
    let brand: Brand
    let selected: Bool
    let logos: LogoService
    var variant: String? = nil
    var body: some View {
        HStack(spacing: 12) {
            BrandIcon(name: brand.name, domain: brand.domain, logos: logos, variant: variant)
            VStack(alignment: .leading, spacing: 2) {
                Text(brand.name).appFont(16, weight: .semibold)
                Text(brand.domain).appFont(12.5).foregroundStyle(AppTheme.muted)
            }.frame(maxWidth: .infinity, alignment: .leading)
            if selected { Image(systemName: "checkmark").foregroundStyle(AppTheme.accentBright) }
        }.padding(12).frame(minHeight: 64).appCard(radius: 18, border: selected ? AppTheme.accent : AppTheme.border)
    }
}
