import SwiftUI
import SubEyeCore

struct SubscriptionEditor: View {
    private enum Page: Hashable { case price, dates, brand }
    private enum Field: Hashable { case name, price, offerPrice, notes }
    @FocusState private var focusedField: Field?
    let original: Subscription?
    @Binding var state: SceneState
    let services: AppServices
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var draft: Subscription
    @State private var date: Date
    @State private var steps: [Page] = []
    @State private var offer = "none"
    @State private var offerPrice = "0"
    @State private var offerEnd = Day.shift(Day.today(), days: 7)
    @State private var paywall = false
    @State private var variant = "auto"
    @State private var initialVariant = "auto"
    @State private var search = ""
    @State private var brands = BrandService.popular
    @State private var searchFailed = false
    private let initial: Subscription

    init(original: Subscription?, state: Binding<SceneState>, services: AppServices) {
        self.original = original; _state = state; self.services = services
        let initial = original ?? Subscription(id: UUID().uuidString, name: "", cost: "", currency: state.wrappedValue.presentation.preferences.preferredCurrency, paymentDate: Day.iso(Day.today()), now: Date())
        self.initial = initial; _draft = State(initialValue: initial); _date = State(initialValue: Day.parse(initial.paymentDate) ?? Day.today())
    }
    private var dirty: Bool { draft != initial || Day.iso(date) != initial.paymentDate || offer != "none" || variant != initialVariant }
    private var valid: Bool { !draft.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && Money.parse(draft.cost) != nil }
    var body: some View {
        NavigationStack(path: $steps) {
            editorPage(original == nil ? 1 : 0)
                .navigationDestination(for: Page.self) { page in
                    switch page {
                    case .price: editorPage(2)
                    case .dates: editorPage(3)
                    case .brand:
                        BrandPicker(services: services, domain: draft.brandDomain, variant: $variant) { selected in
                            draft.brandDomain = selected?.domain
                            if draft.name.isEmpty, let selected { draft.name = selected.name }
                        }
                    }
                }
        }
        .interactiveDismissDisabled(dirty).appSheet(dismissible: !dirty)
        .sheet(isPresented: $paywall) { PaywallView(state: $state, services: services) }
        .task(id: draft.brandDomain) {
            let saved = if let domain = draft.brandDomain { await services.logos.variant(for: domain) ?? "auto" } else { "auto" }
            guard !Task.isCancelled else { return }
            initialVariant = saved; variant = saved
        }
    }
    private func editorPage(_ step: Int) -> some View {
        Group {
            if step == 1 { brandStep.searchable(text: $search, placement: .navigationBarDrawer(displayMode: .always), prompt: L("form_brandSearch")) }
            else {
                ScrollView {
                    VStack(spacing: 24) {
                        if step > 0 { stepHeading(step) }
                        if step != 3 { brandIdentity; priceFields }
                        if step == 0 || step == 3 { dateFields }
                    }.padding(20).padding(.bottom, 20)
                }.scrollDismissesKeyboard(.interactively)
            }
        }
        .appScreen()
        .safeAreaInset(edge: .bottom, spacing: 0) { if step == 1 || step == 2 { footer(step) } }
        .navigationTitle(L(original == nil ? "form_titleNew" : "form_titleEdit"))
        .toolbar {
            ToolbarItem(placement: step > 1 ? .topBarTrailing : .cancellationAction) {
                closeEditor
            }
            if step == 0 || step == 3 {
                ToolbarItem(placement: .confirmationAction) {
                    ActionButton(title: L("form_save"), iconOnly: true, action: save)
                        .disabled(!valid).accessibilityIdentifier("saveSubscription")
                }
            }
        }
        .task(id: search) {
            guard step == 1 else { return }
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
    private func stepHeading(_ step: Int) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) { ForEach(1...3, id: \.self) { index in Capsule().fill(index <= step ? AppTheme.accent : AppTheme.surfaceAlt).frame(height: 4) } }.accessibilityHidden(true)
            Text(L("form_stepOf", ["step": String(step), "total": "3"]) + " · " + L(step == 1 ? "form_brand" : step == 2 ? "form_stepPrice" : "form_stepDates"))
                .appFont(13).foregroundStyle(AppTheme.muted)
        }
    }
    private var brandStep: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 10) {
                stepHeading(1).padding(.horizontal, 4).padding(.bottom, 6)
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
            GlassIconButton(title: L("form_brandChange"), icon: "pencil") { focusedField = nil; steps.append(.brand) }
                .accessibilityIdentifier("subscriptionBrand")
        }.padding(.horizontal, 14).padding(.vertical, 12)
            .background { BrandWash(domain: draft.brandDomain, logos: services.logos, variant: variant) }
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay { RoundedRectangle(cornerRadius: 20).strokeBorder(Color.white.opacity(0.16), lineWidth: 1) }
    }
    private var priceFields: some View {
        VStack(spacing: 24) {
            AppSection {
                FormField(title: L("form_name")) {
                    TextField(L("form_name"), text: $draft.name).focused($focusedField, equals: .name).textContentType(.organizationName).multilineTextAlignment(typeSize.isAccessibilitySize ? .leading : .trailing).accessibilityIdentifier("subscriptionName")
                }
                AppDivider(inset: 16)
                FormField(title: L("form_price")) {
                    HStack(spacing: 8) {
                        TextField("0", text: $draft.cost).focused($focusedField, equals: .price).keyboardType(.decimalPad).multilineTextAlignment(typeSize.isAccessibilitySize ? .leading : .trailing).accessibilityLabel(L("form_price")).accessibilityIdentifier("subscriptionPrice")
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
                AppDivider(inset: 16)
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
            CadenceField(every: $draft.every, period: $draft.period)
        }
    }
    private var dateFields: some View {
        VStack(spacing: 24) {
            AppSection {
                DatePicker(L("form_firstPayment"), selection: $date, displayedComponents: .date).environment(\.timeZone, .gmt).appFont(16).padding(.horizontal, 16).frame(minHeight: 56)
            }
            if original == nil {
                VStack(alignment: .leading, spacing: 10) {
                    AppCaption(title: L("form_startingOffer"))
                    ForEach(["none", "trial", "intro"], id: \.self) { mode in
                        offerChoice(mode)
                    }
                    if offer != "none" {
                        AppSection {
                        if offer == "intro" { FormField(title: L("form_offerCost")) { TextField("0", text: $offerPrice).focused($focusedField, equals: .offerPrice).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }; AppDivider(inset: 16) }
                        DatePicker(L("form_offerEndsAt"), selection: $offerEnd, in: Day.shift(date, days: 1)..., displayedComponents: .date).environment(\.timeZone, .gmt).padding(16)
                        }
                    }
                }
            }
            DisclosureGroup(L("native_advanced")) {
                AppSection {
                    Toggle(L("native_autoPaid"), isOn: $draft.autoPaid).padding(16)
                    AppDivider(inset: 16)
                    TextField(L("native_notes"), text: Binding(get: { draft.notes ?? "" }, set: { draft.notes = $0.isEmpty ? nil : $0 }), axis: .vertical).focused($focusedField, equals: .notes).lineLimit(3...8).padding(16)
                }.padding(.top, 12)
            }.appFont(14).foregroundStyle(AppTheme.muted)
            if original == nil, let amount = Money.parse(draft.cost) {
                VStack(alignment: .leading, spacing: 4) {
                    AppCaption(title: L("form_summaryTitle"))
                    Text(L(offer == "none" ? "form_summaryStandard" : offer == "trial" ? "form_summaryTrial" : "form_summaryIntro", [
                        "price": Display.money(NSDecimalNumber(decimal: amount).doubleValue, draft.currency),
                        "cadence": Display.cadence(draft), "date": Display.date(offer == "none" ? date : offerEnd),
                        "promo": Display.money(Double(offerPrice) ?? 0, draft.currency)
                    ])).appFont(14).fixedSize(horizontal: false, vertical: true)
                }.frame(maxWidth: .infinity, alignment: .leading).padding(14).appCard(radius: 12, fill: AppTheme.surfaceAlt, border: .clear)
            }
        }
    }
    private func offerChoice(_ mode: String) -> some View {
        let key = "form_offer" + mode.capitalized
        return Button {
            if mode != "none" && !state.settings.pro { paywall = true }
            else { offer = mode; offerEnd = max(offerEnd, Day.shift(date, days: 1)) }
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(L(key)).appFont(16, weight: .semibold)
                    Text(L(key + "Hint")).appFont(13).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true)
                }.frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: mode != "none" && !state.settings.pro ? "lock" : offer == mode ? "checkmark.circle.fill" : "circle")
                    .appFont(22).foregroundStyle(offer == mode ? AppTheme.accentBright : AppTheme.muted)
            }.padding(16).appCard(radius: 18, border: offer == mode ? AppTheme.accent : AppTheme.border)
        }.buttonStyle(.plain).accessibilityIdentifier("offer-" + mode).accessibilityAddTraits(offer == mode ? .isSelected : [])
    }
    private func footer(_ step: Int) -> some View {
        VStack(spacing: 0) {
            AppDivider()
            Button(L(step == 1 && draft.brandDomain == nil ? "common_skip" : "common_next")) { focusedField = nil; steps.append(step == 1 ? .price : .dates) }
                .disabled(step == 2 && !valid).accessibilityIdentifier("nextSubscriptionStep")
                .buttonStyle(AppPrimaryButtonStyle()).padding(.horizontal, 20).padding(.top, 14).padding(.bottom, 12)
        }.background(AppTheme.background)
    }
    private func save() async throws {
        focusedField = nil
        var value = draft; value.name = draft.name.trimmingCharacters(in: .whitespacesAndNewlines)
        value.cost = try Display.amount(draft.cost); value.paymentDate = Day.iso(Day.floor(date))
        let offerInput: OfferInput? = offer == "none" ? nil : OfferInput(promoCost: offer == "trial" ? "0" : try Display.amount(offerPrice), standardCost: value.cost, currency: value.currency, endDate: Day.floor(offerEnd))
        try await services.repository.save(value, expected: original, offer: offerInput, now: Date())
        if let domain = value.brandDomain {
            do { try await services.logos.setVariant(variant, for: domain) }
            catch { state.notice = Notice(title: L("native_error"), message: L("native_logoSaveFailed")) }
        }
        if original == nil { state.remindersOfferPending = (try? await services.prompts.afterCreation(settings: state.settings)) ?? false }
        state.reload += 1; dismiss()
    }
}

struct CadenceField: View {
    @Binding var every: Int
    @Binding var period: BillingPeriod
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
            FormField(title: L("form_cycle")) {
                Menu {
                    Picker(L("form_cycle"), selection: choice) {
                        ForEach(presets, id: \.key) { Text(L("form_cycle" + $0.key)).tag($0.key) }
                        Text(L("form_cycleCustom")).tag("Custom")
                    }.pickerStyle(.inline)
                } label: {
                    HStack(spacing: 8) {
                        Text(L("form_cycle" + choice.wrappedValue)).appFont(16).foregroundStyle(AppTheme.text)
                        Image(systemName: "chevron.up.chevron.down").appFont(12, weight: .semibold).foregroundStyle(AppTheme.muted)
                    }.frame(minHeight: 44)
                }.buttonStyle(.plain).accessibilityIdentifier("billingCycle")
                    .accessibilityLabel(L("form_cycle") + ", " + L("form_cycle" + choice.wrappedValue))
            }
            if showsCustom {
                AppDivider(inset: 16)
                FormField(title: L("form_every")) {
                    HStack(spacing: 0) {
                        Picker(L("form_every"), selection: $every) {
                            ForEach(Array(1...60) + (every > 60 ? [every] : []), id: \.self) { Text(String($0)).tag($0) }
                        }.frame(maxWidth: .infinity).clipped().accessibilityIdentifier("cadenceCount")
                        Picker(L("form_cycle"), selection: $period) {
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
    let select: (Brand?) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""
    @State private var brands = BrandService.popular
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
                ForEach(brands) { brand in
                    Button { select(brand); dismiss() } label: { BrandOption(brand: brand, selected: domain == brand.domain, logos: services.logos, variant: domain == brand.domain ? variant : nil) }.buttonStyle(.plain)
                }
                if failed { Text(L("form_brandSearchFailed")).appFont(12.5).foregroundStyle(AppTheme.muted) }
            }.padding(16)
        }.scrollDismissesKeyboard(.interactively).appScreen().searchable(text: $search, placement: .navigationBarDrawer(displayMode: .always), prompt: L("form_brandSearch"))
                .navigationTitle(L("form_brand"))
                .task(id: search) {
                    do {
                        if search.isEmpty { brands = BrandService.popular; failed = false; return }
                        try await Task.sleep(for: .milliseconds(300))
                        brands = try await services.brands.search(search); failed = false
                    } catch is CancellationError { } catch { brands = BrandService.popular.filter { $0.name.localizedStandardContains(search) }; failed = true }
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
