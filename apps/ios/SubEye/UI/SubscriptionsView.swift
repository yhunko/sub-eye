import SwiftUI
import SubEyeCore

struct SubscriptionsView: View {
    @Binding var state: SceneState
    let services: AppServices
    @Binding var sheet: SheetRoute?
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var search = ""
    @State private var settingsChange = 0
    private var rows: [SubscriptionRow] { state.settings.list.apply(state.presentation.rows, search: search) }
    private var currency: String { state.presentation.preferences.preferredCurrency }
    private var narrowed: Bool { !search.isEmpty || state.settings.list.status != "active" || state.settings.list.categoryId != nil }
    private var grouped: [(String, [SubscriptionRow])] {
        let groups = Dictionary(grouping: rows) { row in
            switch state.settings.list.group {
            case "category": return row.category.map { $0.emoji + " " + $0.name } ?? L("home_uncategorized")
            case "period": return L("subs_cadence_" + ["day": "daily", "week": "weekly", "month": "monthly", "year": "yearly"][row.subscription.period.rawValue]!)
            case "currency": return row.subscription.currency.uppercased()
            default: return ""
            }
        }
        return groups.map { ($0.key, $0.value) }.sorted { left, right in
            let leftUncategorized = left.1.allSatisfy { $0.category == nil } && state.settings.list.group == "category"
            let rightUncategorized = right.1.allSatisfy { $0.category == nil } && state.settings.list.group == "category"
            if leftUncategorized != rightUncategorized { return !leftUncategorized }
            return left.1.reduce(0) { $0 + $1.monthly } > right.1.reduce(0) { $0 + $1.monthly }
        }
    }
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                if state.presentation.totalCount == 0 { EmptySubscriptions { sheet = .editor(nil) } }
                else {
                    if !narrowed { totals.padding(.bottom, 6) }
                    if rows.isEmpty { Text(L("subs_emptyFiltered")).appFont(14).foregroundStyle(AppTheme.muted).padding(.vertical, 48) }
                    ForEach(grouped, id: \.0) { group in
                        if !group.0.isEmpty { sectionHeading(group).padding(.top, 14) }
                        ForEach(group.1) { row in
                            NavigationLink(value: Route.subscription(row.id)) { SubscriptionCell(row: row, currency: currency, logos: services.logos) }
                                .buttonStyle(.plain).accessibilityIdentifier("subscription-" + row.id)
                                .contextMenu {
                                    ForEach(row.allowedActions.filter { $0 != .delete && $0 != .edit && $0 != .pricing }, id: \.self) { action in
                                        Button(L("native_action_" + action.rawValue)) { sheet = action == .cancel ? .cancellation(row.id) : .lifecycle(row, action) }
                                    }
                                }
                        }
                    }
                }
            }.padding(.horizontal, 12).padding(.bottom, 24).padding(.top, 4)
        }.scrollDismissesKeyboard(.interactively)
        .searchable(text: $search, placement: .navigationBarDrawer(displayMode: .always), prompt: L("subs_searchPlaceholder"))
        .appScreen().navigationTitle(L("tabs_subscriptions"))
        .toolbar {
            ToolbarItem(placement: .topBarLeading) { AddSubscriptionButton { sheet = .editor(nil) } }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Menu {
                    Picker(L("subs_filterSort"), selection: $state.settings.list.sort) {
                        ForEach(["next", "name", "cost"], id: \.self) { Text(L("subs_sort_" + $0)).tag($0) }
                    }.pickerStyle(.inline)
                    } label: { Label(optionLabel("subs_filterSort", value: "subs_sort_" + state.settings.list.sort, active: state.settings.list.sort != "next"), systemImage: state.settings.list.sort == "next" ? "arrow.up.arrow.down" : "arrow.up.arrow.down.circle.fill") }.accessibilityIdentifier("filterSort")
                    Menu {
                    Picker(L("subs_groupBy"), selection: $state.settings.list.group) {
                        ForEach(state.settings.pro || state.settings.list.group == "category" ? ["none", "category", "period", "currency"] : ["none", "period", "currency"], id: \.self) { Text(L("native_group_" + $0)).tag($0) }
                    }.pickerStyle(.inline)
                    } label: { Label(optionLabel("subs_groupBy", value: "native_group_" + state.settings.list.group, active: state.settings.list.group != ListOptions().group), systemImage: state.settings.list.group == ListOptions().group ? "square.grid.2x2" : "square.grid.2x2.fill") }.accessibilityIdentifier("filterGroup")
                    Menu {
                    Picker(L("subs_filterStatus"), selection: $state.settings.list.status) {
                        ForEach(["all", "active", "paused", "cancelling", "cancelled"], id: \.self) { Text(L("subs_status_" + $0)).tag($0) }
                    }.pickerStyle(.inline)
                    } label: { Label(optionLabel("subs_filterStatus", value: "subs_status_" + state.settings.list.status, active: state.settings.list.status != "active"), systemImage: state.settings.list.status == "active" ? "line.3.horizontal.decrease" : "line.3.horizontal.decrease.circle.fill") }.accessibilityIdentifier("filterStatus")
                    if state.settings.pro, !state.presentation.categories.isEmpty {
                        Menu {
                        Picker(L("form_category"), selection: $state.settings.list.categoryId) {
                            Text(L("subs_categoryAll")).tag(String?.none)
                            ForEach(state.presentation.categories) { Text($0.emoji + " " + $0.name).tag(Optional($0.id)) }
                        }.pickerStyle(.inline)
                        } label: { Label(L("form_category") + (state.presentation.categories.first { $0.id == state.settings.list.categoryId }.map { " · " + $0.name } ?? ""), systemImage: state.settings.list.categoryId == nil ? "tag" : "tag.fill") }.accessibilityIdentifier("filterCategory")
                    } else if !state.settings.pro { Button { sheet = .paywall } label: { Label(L("paywall_lockFilter"), systemImage: "lock") } }
                    if narrowed || state.settings.list != ListOptions() { Section { Button { state.settings.list = ListOptions(); search = "" } label: { Label(L("subs_filterReset"), systemImage: "arrow.counterclockwise") } } }
                } label: { Label(L("subs_listOptions"), systemImage: narrowed ? "line.3.horizontal.decrease.circle.fill" : "ellipsis.circle") }
                    .tint(narrowed ? AppTheme.accent : AppTheme.text).accessibilityIdentifier("subscriptionFilters")
            }
        }
        .onChange(of: state.settings.list) { _ in settingsChange += 1 }
        .task(id: settingsChange) {
            guard settingsChange > 0 else { return }
            do { try await services.repository.setSetting("subs.filters", value: state.settings.list) }
            catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
        }
    }
    private func optionLabel(_ title: String, value: String, active: Bool) -> String {
        L(title) + (active ? " · " + L(value) : "")
    }
    private var totals: some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: 10)) : AnyLayout(HStackLayout(spacing: 10))
        return layout {
            totalCard(L("subs_totalMonthly"), amount: state.presentation.dashboard.monthly)
            totalCard(L("subs_totalYearly"), amount: state.presentation.dashboard.yearly)
        }
    }
    private func totalCard(_ title: String, amount: Double) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title.uppercased()).appFont(11.5, weight: .semibold, relativeTo: .caption).tracking(0.5).foregroundStyle(AppTheme.muted)
            Text(Display.money(amount, currency, decimals: 0)).appFont(22, weight: .heavy, relativeTo: .title2).tracking(-0.4).lineLimit(1).minimumScaleFactor(0.72)
        }.frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 16).padding(.vertical, 14).appCard()
    }
    private func sectionHeading(_ group: (String, [SubscriptionRow])) -> some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 2)) : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 12))
        return layout {
            Text(group.0).appFont(15, weight: .bold).frame(maxWidth: .infinity, alignment: .leading)
            Text(Display.money(group.1.reduce(0) { $0 + $1.monthly }, currency) + L("subs_perMonthSuffix")).appFont(13.5, weight: .semibold).monospacedDigit()
        }.foregroundStyle(AppTheme.muted).padding(.horizontal, 6).accessibilityAddTraits(.isHeader)
    }
}

struct ListOptionsView: View {
    @Binding var state: SceneState
    let services: AppServices
    @Environment(\.dismiss) private var dismiss
    @State private var paywall = false
    @State private var value: ListOptions
    init(state: Binding<SceneState>, services: AppServices) {
        _state = state; self.services = services; _value = State(initialValue: state.wrappedValue.settings.list)
    }
    var body: some View {
        NavigationStack {
            Form {
                Picker(L("subs_filterStatus"), selection: $value.status) {
                    ForEach(["all", "active", "paused", "cancelling", "cancelled"], id: \.self) { Text(L("subs_status_" + $0)).tag($0) }
                }
                if state.settings.pro {
                    Picker(L("form_category"), selection: $value.categoryId) {
                        Text(L("subs_categoryAll")).tag(String?.none)
                        ForEach(state.presentation.categories) { Text($0.emoji + " " + $0.name).tag(Optional($0.id)) }
                    }
                } else {
                    Button(L("paywall_lockFilter")) { paywall = true }
                }
                Picker(L("subs_filterSort"), selection: $value.sort) {
                    ForEach(["next", "name", "cost"], id: \.self) { Text(L("subs_sort_" + $0)).tag($0) }
                }
                Picker(L("subs_groupBy"), selection: $value.group) {
                    ForEach(state.settings.pro || value.group == "category" ? ["none", "category", "period", "currency"] : ["none", "period", "currency"], id: \.self) { Text(L("native_group_" + $0)).tag($0) }
                }
                Button(L("subs_filterReset")) { value = ListOptions() }
            }
            .navigationTitle(L("subs_listOptions"))
            .toolbar { ToolbarItem(placement: .confirmationAction) { ActionButton(title: L("common_done")) {
                try await services.repository.setSetting("subs.filters", value: value); state.settings.list = value
                dismiss()
            } } }
        }.presentationDetents([.medium, .large])
            .sheet(isPresented: $paywall) { PaywallView(state: $state, services: services) }
    }
}
