import SwiftUI
import SubEyeCore

struct HomeView: View {
    @Binding var state: SceneState
    let services: AppServices
    @Binding var sheet: SheetRoute?
    var openCalendar: () -> Void
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var expanded = false
    @ScaledMetric private var railWidth: CGFloat = 50
    @ScaledMetric private var circleSize: CGFloat = 34
    private var model: Presentation { state.presentation }
    private var currency: String { model.preferences.preferredCurrency }
    private var today: Date { Day.today(Date(), zone: TimeZone(identifier: model.preferences.preferredTimezone) ?? .current) }
    private var active: [SubscriptionRow] { model.rows.filter { $0.status.isCurrent }.sorted { $0.monthly > $1.monthly } }
    private var layout: AnyLayout { typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 16)) : AnyLayout(HStackLayout(alignment: .top, spacing: 16)) }
    private var breakdown: [(id: String, name: String, amount: Double)] {
        guard state.settings.pro else { return active.map { ($0.id, $0.subscription.name, $0.monthly) } }
        let groups = Dictionary(grouping: active.filter { $0.nextAmount != nil }) { $0.category?.id ?? "uncategorized" }
        return groups.map { id, rows in
            (id, rows.first?.category?.name ?? L("home_uncategorized"), rows.reduce(0) { $0 + $1.monthly })
        }.sorted { $0.2 > $1.2 }
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if model.totalCount == 0 { EmptySubscriptions { sheet = .editor(nil) } }
                else {
                    paymentRail.padding(.bottom, 14)
                    if !model.dashboard.decisions.isEmpty { decisions }
                    monthCard
                    if let savings = model.dashboard.savings, savings.total > 0 { savedRow(savings) }
                    if !breakdown.isEmpty { spending }
                }
            }.padding(16).padding(.bottom, 8)
        }
        .background(alignment: .topLeading) {
            RadialGradient(colors: [AppTheme.accent.opacity(0.30), AppTheme.accent.opacity(0.06), .clear], center: .center, startRadius: 0, endRadius: 230)
                .frame(width: 460, height: 420).offset(x: -90, y: -170).accessibilityHidden(true)
        }
        .appScreen().navigationTitle("")
        .toolbar {
            if #available(iOS 26, *) {
                ToolbarItem(placement: .topBarLeading) { monthHeading }.sharedBackgroundVisibility(.hidden)
            } else { ToolbarItem(placement: .topBarLeading) { monthHeading } }
            ToolbarItem(placement: .topBarTrailing) { AddSubscriptionButton { sheet = .editor(nil) } }
        }
    }
    @ViewBuilder private var monthHeading: some View {
        Text(today.formatted(Date.FormatStyle(timeZone: .gmt).month(.wide)).localizedCapitalized)
            .appFont(24, weight: .heavy, relativeTo: .title2).tracking(-0.5).lineLimit(1).minimumScaleFactor(0.7).accessibilityAddTraits(.isHeader)
            .fixedSize(horizontal: true, vertical: false)
            .padding(.leading, headingInset)
    }
    private var headingInset: CGFloat { if #available(iOS 26, *) { 16 } else { 0 } }
    private var paymentRail: some View {
        let count = Day.utc.dateComponents([.day], from: today, to: Day.month(Day.monthStart(today), offset: 1)).day ?? 0
        let byDay = Dictionary(grouping: model.dashboard.monthEvents.filter { $0.kind == .payment }) { Day.key($0.date) }
        let next = model.dashboard.monthEvents.first { $0.kind == .payment && $0.date > today }?.date
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 2) {
                ForEach(0..<count, id: \.self) { offset in
                    let date = Day.shift(today, days: offset)
                    let summary = model.dashboard.paymentDays?[Day.key(date)]
                    let charges = byDay[Day.key(date)] ?? []
                    if offset > 0 && Day.utc.component(.weekday, from: date) == 2 {
                        Rectangle().fill(AppTheme.border).frame(width: 0.5, height: 108).padding(.horizontal, 5)
                    }
                    let ids = Set(charges.map(\.subscriptionId))
                    NavigationLink(value: ids.count == 1 ? Route.subscription(ids.first!) : Route.due(Day.key(date))) {
                        VStack(spacing: 7) {
                            Text(date.formatted(Date.FormatStyle(timeZone: .gmt).weekday(.abbreviated)).uppercased()).appFont(11, weight: .semibold, relativeTo: .caption).tracking(0.4).foregroundStyle(AppTheme.muted)
                            Text(String(Day.utc.component(.day, from: date))).appFont(17, weight: .semibold).monospacedDigit()
                                .foregroundStyle(date == today ? AppTheme.background : date == next ? AppTheme.accentBright : AppTheme.text)
                                .frame(width: circleSize, height: circleSize)
                                .background(date == today ? AppTheme.accent : .clear, in: Circle())
                                .overlay { Circle().strokeBorder(date == next ? AppTheme.accent : .clear, lineWidth: 2) }
                            VStack(spacing: 4) {
                                if !charges.isEmpty {
                                    HStack(spacing: -4) {
                                        ForEach(charges.prefix(2)) { event in
                                            BrandIcon(name: event.name, domain: event.domain, logos: services.logos, size: 22).padding(2).background(AppTheme.background, in: Circle())
                                        }
                                        if (summary?.count ?? charges.count) > 2 { Text("+\((summary?.count ?? charges.count) - 2)").appFont(10, weight: .bold).padding(4).background(AppTheme.surfaceAlt, in: Capsule()) }
                                    }
                                    Text(Display.money(summary?.total ?? 0, currency, decimals: 0)).appFont(10.5, weight: .semibold, relativeTo: .caption2).foregroundStyle(AppTheme.muted).lineLimit(1).minimumScaleFactor(0.76)
                                }
                            }.frame(minHeight: 48, alignment: .top)
                        }.frame(width: railWidth)
                    }.buttonStyle(.plain).disabled(charges.isEmpty).accessibilityLabel(Display.date(date, long: true) + ", " + Display.money(summary?.total ?? 0, currency))
                }
            }.padding(.horizontal, 16)
        }.padding(.horizontal, -16)
    }
    private var monthCard: some View {
        let dashboard = model.dashboard
        let charged = max(0, dashboard.monthTotal - dashboard.remaining)
        return VStack(alignment: .leading, spacing: 0) {
            Text(L("home_remainingThisMonth")).appFont(13, weight: .medium, relativeTo: .caption).foregroundStyle(AppTheme.muted).accessibilityAddTraits(.isHeader)
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .firstTextBaseline, spacing: 7) { remainingAmount; denominator }
                VStack(alignment: .leading, spacing: 2) { remainingAmount; denominator }
            }.padding(.top, 4)
            if dashboard.monthTotal > 0 { SpendTrack(progress: charged / dashboard.monthTotal, height: 6).padding(.top, 12) }
            Text(L("home_chargedSoFar", ["amount": Display.money(charged, currency)])).appFont(13, relativeTo: .caption).foregroundStyle(AppTheme.muted).padding(.top, 8)
            AppDivider().padding(.top, 16).padding(.bottom, 14)
            layout {
                forecast
                if let biggest = active.first(where: { $0.nextAmount != nil }) {
                    if !typeSize.isAccessibilitySize { Rectangle().fill(AppTheme.border).frame(width: 0.5, height: 58) }
                    NavigationLink(value: Route.subscription(biggest.id)) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(L("home_biggest")).appFont(13, relativeTo: .caption).foregroundStyle(AppTheme.muted)
                            HStack(spacing: 9) {
                                BrandIcon(name: biggest.subscription.name, domain: biggest.subscription.brandDomain, logos: services.logos)
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(Display.money(biggest.monthly, currency, decimals: 0) + L("subs_perMonthSuffix")).appFont(19, weight: .bold)
                                        .lineLimit(1).minimumScaleFactor(0.74)
                                    Text(biggest.subscription.name).appFont(11.5, relativeTo: .caption).foregroundStyle(AppTheme.muted).lineLimit(typeSize.isAccessibilitySize ? nil : 1)
                                }
                            }
                        }.frame(maxWidth: .infinity, alignment: .leading)
                    }.buttonStyle(.plain)
                }
            }
        }.padding(.horizontal, 18).padding(.top, 18).padding(.bottom, 16).appCard()
    }
    private var forecast: some View {
        let delta = model.dashboard.nextMonth.rounded() - model.dashboard.monthTotal.rounded()
        return VStack(alignment: .leading, spacing: 4) {
            Text(L("home_nextMonthForecast")).appFont(13, relativeTo: .caption).foregroundStyle(AppTheme.muted)
            Text(Display.money(model.dashboard.nextMonth, currency, decimals: 0)).appFont(19, weight: .bold).monospacedDigit()
            if delta == 0 { Text(L("home_deltaNone")).appFont(11.5, relativeTo: .caption).foregroundStyle(AppTheme.muted) }
            else {
                Label(L(delta > 0 ? "home_deltaMore" : "home_deltaLess", ["amount": Display.money(abs(delta), currency, decimals: 0)]), systemImage: delta > 0 ? "arrow.up" : "arrow.down")
                    .appFont(11.5, weight: .semibold, relativeTo: .caption).foregroundStyle(delta > 0 ? AppTheme.danger : AppTheme.accentBright)
            }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private var remainingAmount: some View {
        let amount = Display.money(model.dashboard.remaining, currency)
        let parts = amount.split(separator: ".", maxSplits: 1).map(String.init)
        return HStack(alignment: .firstTextBaseline, spacing: 0) {
            Text(parts[0]).appFont(30, weight: .heavy, relativeTo: .title).tracking(-1.4)
            if parts.count > 1 { Text("." + parts[1]).appFont(20, weight: .bold, relativeTo: .title3).foregroundStyle(AppTheme.muted) }
        }.monospacedDigit().accessibilityElement(children: .ignore).accessibilityLabel(amount)
    }
    @ViewBuilder private var denominator: some View {
        if model.dashboard.monthTotal > 0 { Text(L("home_remainingOf", ["total": Display.money(model.dashboard.monthTotal, currency, decimals: 0)])).appFont(12.5, relativeTo: .caption).foregroundStyle(AppTheme.muted) }
    }
    private func savedRow(_ savings: SavingsLedger) -> some View {
        let total = Text(Display.money(savings.total, currency, decimals: 0)).appFont(17, weight: .bold).monospacedDigit().foregroundStyle(AppTheme.accentBright).lineLimit(1)
        return NavigationLink(value: Route.saved) {
            HStack(spacing: 12) {
                ToneIcon(symbol: "chart.line.downtrend.xyaxis", tone: AppTheme.accentBright, size: 36)
                VStack(alignment: .leading, spacing: 2) {
                    Text(L("home_saved")).appFont(15, weight: .semibold)
                    if savings.stopped > 0 {
                        Text(L("home_savedStopped", ["count": String(savings.stopped), "amount": Display.money(savings.monthly, currency, decimals: 0)]))
                            .appFont(13, relativeTo: .caption).foregroundStyle(AppTheme.muted)
                    }
                    if typeSize.isAccessibilitySize { total }
                }.fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
                if !typeSize.isAccessibilitySize { total }
                Image(systemName: "chevron.right").appFont(13, weight: .semibold).foregroundStyle(AppTheme.muted).accessibilityHidden(true)
            }.padding(.leading, 16).padding(.trailing, 14).padding(.vertical, 14).appCard().contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityIdentifier("savedWithSubEye")
    }
    private var decisions: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) { sectionTitle(L("home_decisions")); Spacer(); Text(String(model.dashboard.decisions.count)).appFont(13, relativeTo: .caption).foregroundStyle(AppTheme.muted) }.padding(.horizontal, 4)
            VStack(spacing: 0) {
                ForEach(Array(model.dashboard.decisions.prefix(3).enumerated()), id: \.element.id) { index, event in
                    if index > 0 { AppDivider() }
                    NavigationLink(value: Route.subscription(event.subscriptionId)) { EventCell(event: event, currency: currency, logos: services.logos, note: decisionNote(event)) }.buttonStyle(.plain).padding(.vertical, 12)
                }
                if model.dashboard.decisions.count > 3 { Button(L("home_decisionMore", ["count": String(model.dashboard.decisions.count - 3)]), action: openCalendar).appFont(13.5).padding(.vertical, 12) }
            }.padding(.horizontal, 16).appCard()
        }
    }
    private func decisionNote(_ event: CalendarEvent) -> String? {
        switch event.kind {
        case .priceChange, .introEnds: model.rows.first { $0.id == event.subscriptionId }.map { L("home_decisionWas", ["amount": Display.money($0.amount, currency)]) }
        case .trialEnds: L("home_decisionFirstPayment")
        default: nil
        }
    }
    private func sectionTitle(_ title: String) -> some View {
        Text(title).appFont(15, weight: .semibold).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
    }
    private var spending: some View {
        let rows = breakdown
        let total = rows.reduce(0) { $0 + $1.amount }
        return VStack(alignment: .leading, spacing: 10) {
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .firstTextBaseline) { sectionTitle(L("home_whereItGoes")); Spacer(); breakdownCount(rows.count) }
                VStack(alignment: .leading) { sectionTitle(L("home_whereItGoes")); breakdownCount(rows.count) }
            }.padding(.horizontal, 4).padding(.top, 6)
            VStack(spacing: 0) {
                GeometryReader { geometry in
                    HStack(spacing: 3) {
                        ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                            Capsule().fill(AppTheme.categoryColors[index % 7]).frame(width: max(0, geometry.size.width - CGFloat(rows.count - 1) * 3) * row.amount / max(1, total))
                        }
                    }
                }.frame(height: 10).padding(.bottom, 6).accessibilityHidden(true)
                ForEach(Array(rows.prefix(expanded ? rows.count : 4).enumerated()), id: \.element.id) { index, row in
                    if index > 0 { AppDivider() }
                    HStack(alignment: .center, spacing: 10) {
                        Circle().fill(AppTheme.categoryColors[index % 7]).frame(width: 9, height: 9).accessibilityHidden(true)
                        if !state.settings.pro, let subscription = model.rows.first(where: { $0.id == row.id }) {
                            BrandIcon(name: row.name, domain: subscription.subscription.brandDomain, logos: services.logos, size: 28)
                        }
                        if typeSize.isAccessibilitySize {
                            VStack(alignment: .leading, spacing: 4) { Text(row.name).appFont(15, weight: .medium); breakdownFigures(row.amount, total: total) }
                        } else {
                            Text(row.name).appFont(15, weight: .medium).frame(maxWidth: .infinity, alignment: .leading).lineLimit(1)
                            breakdownFigures(row.amount, total: total)
                        }
                    }.padding(.vertical, 11).padding(.horizontal, 2).accessibilityElement(children: .combine)
                }
                if rows.count > 4 {
                    AppDivider()
                    Button { expanded.toggle() } label: {
                        HStack {
                            Text(expanded ? L("home_breakdownLess") : L(state.settings.pro ? "home_moreCategories" : "home_moreSubscriptions", ["count": String(rows.count - 4)]))
                            Spacer(); Image(systemName: expanded ? "chevron.up" : "chevron.down")
                        }.appFont(13.5).foregroundStyle(AppTheme.muted).frame(minHeight: 44)
                    }.buttonStyle(.plain)
                }
            }.padding(.horizontal, 16).padding(.top, 16).padding(.bottom, 4).appCard()
        }
    }
    private func breakdownCount(_ count: Int) -> some View {
        Text(L(state.settings.pro ? "home_countCategories" : "home_countSubscriptions", ["count": String(count)])).appFont(13, relativeTo: .caption).foregroundStyle(AppTheme.muted)
    }
    private func breakdownFigures(_ amount: Double, total: Double) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text("\(Int((amount / max(1, total) * 100).rounded()))%").appFont(12.5, relativeTo: .caption).foregroundStyle(AppTheme.muted)
            Text(Display.money(amount, currency)).appFont(14, weight: .bold).monospacedDigit().frame(minWidth: 78, alignment: .trailing)
        }
    }
}

struct SavedSubscriptionsView: View {
    @Binding var state: SceneState
    let services: AppServices
    private var rows: [SubscriptionRow] {
        let savings = state.presentation.dashboard.savings?.subscriptions ?? [:]
        let ended = state.presentation.rows.filter { $0.status == .cancelled }
        let rows = ended.isEmpty ? state.presentation.rows.filter { (savings[$0.id] ?? 0) > 0 } : ended
        return rows.sorted { (savings[$0.id] ?? 0) > (savings[$1.id] ?? 0) }
    }
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                ForEach(rows) { row in
                    NavigationLink(value: Route.subscription(row.id)) {
                        SubscriptionCell(row: row, currency: state.presentation.preferences.preferredCurrency, logos: services.logos)
                    }.buttonStyle(.plain).accessibilityIdentifier("subscription-" + row.id)
                }
            }.padding(.horizontal, 12).padding(.top, 4).padding(.bottom, 24)
        }.appScreen().navigationTitle(L("home_saved"))
    }
}
