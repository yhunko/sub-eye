import SwiftUI
import PhotosUI
import SubEyeCore

struct ScreenshotImportView: View {
    struct Draft: Identifiable {
        let id = UUID()
        var subscription: Subscription
        var included: Bool
        let existing: Bool
        var variant = "auto"
        var valid: Bool { !subscription.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && Money.parse(subscription.cost) != nil }
    }
    @Binding var state: SceneState
    let services: AppServices
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var picks: [PhotosPickerItem] = []
    @State private var drafts: [Draft]?
    @State private var skipped = 0
    @State private var reading = false
    @State private var saved = false
    @State private var added: Set<UUID> = []
    @State private var remindersOffer = false
    @State private var rates: ExchangeRates?
    @State private var editing: UUID?
    private var zone: TimeZone { TimeZone(identifier: state.presentation.preferences.preferredTimezone) ?? .current }
    private var dirty: Bool { drafts?.isEmpty == false && !saved }
    private var count: Int { drafts?.filter { $0.included && $0.valid }.count ?? 0 }

    var body: some View {
        NavigationStack {
            Group {
                if reading { readingState }
                else if let drafts, !drafts.isEmpty { review }
                else if drafts != nil { nothingFound }
                else { intro }
            }
            .appScreen()
            .navigationTitle(L("import_title"))
            .navigationDestination(for: UUID.self) { id in
                if let draft = drafts?.first(where: { $0.id == id }), let row = row(draft) {
                    SubscriptionDetail(id: draft.subscription.id, state: $state, services: services, sheet: .constant(nil), preview: row)
                        .toolbar {
                            ToolbarItem(placement: .topBarTrailing) {
                                Button { editing = id } label: { Label(L("native_action_edit"), systemImage: "pencil") }.tint(AppTheme.text)
                            }
                        }
                }
            }
            .toolbar { ToolbarItem(placement: .cancellationAction) { closeButton } }
        }
        .interactiveDismissDisabled(dirty).appSheet(dismissible: !dirty)
        .sheet(isPresented: Binding(get: { editing != nil }, set: { if !$0 { editing = nil } })) {
            if let id = editing, let draft = drafts?.first(where: { $0.id == id }) {
                SubscriptionEditor(original: draft.subscription, state: $state, services: services, commit: { value, variant in
                    guard let index = drafts?.firstIndex(where: { $0.id == id }) else { return }
                    drafts?[index].subscription = value
                    drafts?[index].variant = variant
                    if !draft.existing { drafts?[index].included = true }
                }) { _, _ in }
                    .environment(\.dynamicTypeSize, typeSize)
            }
        }
        .sheet(isPresented: $remindersOffer, onDismiss: { dismiss() }) {
            PromptView(prompt: .reminders, state: $state, services: services).environment(\.dynamicTypeSize, typeSize)
        }
        .task(id: picks) {
            guard !picks.isEmpty else { return }
            reading = true
            defer { reading = false; picks = [] }
            do {
                var images: [Data] = []
                for item in picks { if let data = try await item.loadTransferable(type: Data.self) { images.append(data) } }
                let found = try await services.screenshots.drafts(images, now: Date(), zone: zone, region: Locale.current.currency?.identifier.lowercased())
                rates = try await services.exchange.cached()
                skipped = found.filter { $0.status == .ends }.count
                drafts = found.filter { $0.status == .renews }.map(draft)
            } catch is CancellationError {
            } catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
        }
    }

    @ViewBuilder private var closeButton: some View {
        if dirty {
            Menu {
                Section(L("form_discardTitle")) {
                    Button(role: .destructive) { dismiss() } label: { DestructiveMenuLabel(title: L("form_discardConfirm")) }
                }
            } label: { Label(L("common_cancel"), systemImage: "xmark") }.labelStyle(.iconOnly).tint(AppTheme.text)
        } else { SheetCloseButton() }
    }

    private var intro: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Image(systemName: "text.viewfinder").appFont(40).foregroundStyle(AppTheme.accentBright).accessibilityHidden(true)
                Text(L("import_introTitle")).appFont(26, weight: .bold, relativeTo: .title).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                Text(L("import_introBody")).appFont(16).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true)
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(1...3, id: \.self) { step in
                        HStack(alignment: .firstTextBaseline, spacing: 12) {
                            Text(String(step)).appFont(15, weight: .bold).foregroundStyle(AppTheme.accentBright).monospacedDigit()
                            Text(L("import_step\(step)")).appFont(16).fixedSize(horizontal: false, vertical: true)
                        }.accessibilityElement(children: .combine)
                    }
                }.padding(16).frame(maxWidth: .infinity, alignment: .leading).appCard(radius: 18)
                Button(L("import_open")) { openURL(URL(string: "https://apps.apple.com/account/subscriptions")!) }
                    .appFont(16, weight: .semibold).foregroundStyle(AppTheme.accentBright).frame(minHeight: 44)
            }.padding(20)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) { footer { picker(L("import_choose")) } }
    }

    private var readingState: some View {
        VStack(spacing: 14) {
            ProgressView().controlSize(.large)
            Text(L("import_reading")).appFont(16).foregroundStyle(AppTheme.muted)
        }.frame(maxWidth: .infinity, maxHeight: .infinity).accessibilityElement(children: .combine)
    }

    private var nothingFound: some View {
        VStack(spacing: 12) {
            Text(L("import_noneTitle")).appFont(20, weight: .bold, relativeTo: .title3)
            Text(L("import_noneBody")).appFont(16).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true)
        }.multilineTextAlignment(.center).padding(32).frame(maxWidth: .infinity, maxHeight: .infinity)
            .safeAreaInset(edge: .bottom, spacing: 0) { footer { picker(L("import_chooseAgain")) } }
    }

    private var review: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                Text(L("import_reviewHint")).appFont(15).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 4).padding(.bottom, 6)
                ForEach(drafts ?? []) { draft in cell(draft) }
                if skipped > 0 {
                    Text(L("import_skipped", ["count": String(skipped)])).appFont(13).foregroundStyle(AppTheme.muted)
                        .fixedSize(horizontal: false, vertical: true).padding(.horizontal, 4).padding(.top, 6)
                }
            }.padding(16)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            footer {
                ActionButton(title: L("import_add", ["count": String(count)]), action: save)
                    .disabled(count == 0 || saved).accessibilityIdentifier("addImported")
            }
        }
    }

    private func cell(_ draft: Draft) -> some View {
        HStack(spacing: 10) {
            Button {
                if let index = drafts?.firstIndex(where: { $0.id == draft.id }) { drafts?[index].included.toggle() }
            } label: {
                Image(systemName: draft.included && draft.valid ? "checkmark.circle.fill" : "circle").appFont(22)
                    .foregroundStyle(draft.included && draft.valid ? AppTheme.accentBright : AppTheme.muted).frame(minWidth: 30, minHeight: 44)
            }.buttonStyle(.plain).disabled(!draft.valid)
                .accessibilityLabel(L("import_include", ["name": draft.subscription.name]))
                .accessibilityAddTraits(draft.included && draft.valid ? .isSelected : [])
            VStack(alignment: .leading, spacing: 6) {
                if let row = row(draft) {
                    NavigationLink(value: draft.id) {
                        SubscriptionCell(row: row, currency: state.presentation.preferences.preferredCurrency, logos: services.logos)
                    }.buttonStyle(.plain)
                } else {
                    Button { editing = draft.id } label: { pricelessCell(draft) }.buttonStyle(.plain)
                }
                if draft.existing {
                    Text(L("import_existing")).appFont(12.5).foregroundStyle(AppTheme.muted).padding(.leading, 10)
                }
            }
        }
    }

    private func pricelessCell(_ draft: Draft) -> some View {
        HStack(spacing: 11) {
            BrandIcon(name: draft.subscription.name, domain: draft.subscription.brandDomain, logos: services.logos)
            VStack(alignment: .leading, spacing: 2) {
                Text(draft.subscription.name).appFont(15, weight: .semibold)
                Text(L("import_needsPrice")).appFont(12.5, relativeTo: .subheadline).foregroundStyle(AppTheme.accentBright)
            }.frame(maxWidth: .infinity, alignment: .leading)
            Image(systemName: "chevron.right").appFont(13, weight: .semibold).foregroundStyle(AppTheme.muted).accessibilityHidden(true)
        }.padding(.horizontal, 10).padding(.vertical, 8).frame(minHeight: 64).appCard(radius: 18).accessibilityElement(children: .combine)
    }

    // The same projection the list runs, so the cell and the preview read exactly as the saved subscription will.
    private func row(_ draft: Draft) -> SubscriptionRow? {
        guard draft.valid, let rates, let cost = try? Display.amount(draft.subscription.cost) else { return nil }
        var subscription = draft.subscription
        subscription.cost = cost
        return Projection.rows(StoreDocument(preferences: state.presentation.preferences, subscriptions: [subscription]), rates: rates, now: Date()).first
    }

    private func picker(_ title: String) -> some View {
        PhotosPicker(selection: $picks, maxSelectionCount: 5, selectionBehavior: .ordered, matching: .images) { Text(title) }
            .accessibilityIdentifier("chooseScreenshots")
    }

    private func footer<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        VStack(spacing: 0) {
            AppDivider()
            content().buttonStyle(AppPrimaryButtonStyle()).padding(.horizontal, 20).padding(.top, 14).padding(.bottom, 12)
        }.background(AppTheme.background)
    }

    private func draft(_ found: ImportDraft) -> Draft {
        let lower = found.name.lowercased()
        let brand = BrandService.popular.first { brand in
            let prefix = brand.name.lowercased()
            return lower.hasPrefix(prefix) && lower.dropFirst(prefix.count).first?.isLetter != true
        }
        let subscription = Subscription(id: UUID().uuidString, name: found.name, cost: found.cost.map(Money.canonical) ?? "",
                                        currency: found.currency ?? state.presentation.preferences.preferredCurrency, every: found.every,
                                        period: found.period ?? .month, paymentDate: Day.iso(found.renewal ?? Day.today()), now: Date(),
                                        brandDomain: brand?.domain)
        let existing = Lifecycle.counterpart(name: found.name, domain: brand?.domain, in: state.presentation.rows) != nil
        return Draft(subscription: subscription, included: !existing, existing: existing)
    }

    private func save() async throws {
        guard !saved, let current = drafts else { return }
        let chosen = try current.filter { $0.included && $0.valid && !added.contains($0.id) }.map { draft in
            (draft.id, try SubscriptionEditor.value(draft.subscription, firstPayment: Day.parse(draft.subscription.paymentDate) ?? Day.today(), offer: .none, now: Date(), zone: zone).subscription)
        }
        let rates = try await services.exchange.cached()
        defer { state.reload += 1 }
        for (id, value) in chosen {
            try await services.repository.save(value, expected: nil, rates: rates, now: Date())
            added.insert(id)
            if let domain = value.brandDomain, let variant = current.first(where: { $0.id == id })?.variant, variant != "auto" {
                try? await services.logos.setVariant(variant, for: domain)
            }
        }
        saved = true
        let permission = await services.notifications.permission()
        remindersOffer = (try? await services.prompts.afterCreation(settings: state.settings,
            permissionAllowsNotifications: permission == .authorized || permission == .provisional || permission == .ephemeral)) ?? false
        if !remindersOffer { dismiss() }
    }
}
