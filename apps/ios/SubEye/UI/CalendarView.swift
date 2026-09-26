import SwiftUI
import SubEyeCore

struct RenewalCalendarView: View {
    @Binding var state: SceneState
    let services: AppServices
    @Binding var sheet: SheetRoute?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var month = Day.monthStart(Day.today())
    @State private var pageAnchor = Day.monthStart(Day.today())
    @State private var options = false
    @State private var calendarOptions = CalendarOptions()
    private var months: [Date] { (-24...24).map { Day.month(pageAnchor, offset: $0) } }
    private var monthTitle: String { month.formatted(Date.FormatStyle(timeZone: .gmt).year().month(.wide)).localizedCapitalized }
    private var isCurrentMonth: Bool { month == Day.monthStart(Day.today()) }
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Button { go(to: Day.monthStart(Day.today())) } label: {
                    Text(L("when_today")).appFont(13, weight: .semibold).foregroundStyle(isCurrentMonth ? AppTheme.accentBright : AppTheme.text)
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .appCard(radius: 999, fill: AppTheme.surfaceAlt, border: isCurrentMonth ? AppTheme.accent : AppTheme.border)
                        .frame(minHeight: 44).contentShape(Rectangle())
                }.accessibilityIdentifier("calendarToday").accessibilityAddTraits(isCurrentMonth ? .isSelected : [])
                Spacer()
                Button { go(to: Day.month(month, offset: -1)) } label: { Image(systemName: "chevron.left").appFont(15, weight: .semibold).frame(width: 44, height: 44).appCard(radius: 999) }.accessibilityLabel(L("calendar_prevMonth"))
                Button { go(to: Day.month(month, offset: 1)) } label: { Image(systemName: "chevron.right").appFont(15, weight: .semibold).frame(width: 44, height: 44).appCard(radius: 999) }.accessibilityLabel(L("calendar_nextMonth"))
            }.buttonStyle(.plain).padding(.horizontal, 16).padding(.top, 10).padding(.bottom, 8)
            TabView(selection: $month) {
                ForEach(months, id: \.self) { page in
                    CalendarMonthPage(month: page, state: $state, services: services).tag(page)
                }
            }.tabViewStyle(.page(indexDisplayMode: .never)).id(pageAnchor).accessibilityIdentifier("calendarPager")
        }.appScreen().navigationTitle(monthTitle)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    if state.settings.pro {
                        NavigationLink(value: Route.year(Day.utc.component(.year, from: month))) { Label(L("calendar_year"), systemImage: "square.grid.3x3") }.accessibilityIdentifier("calendarYear")
                    } else {
                        Button { sheet = .paywall } label: { Label(L("calendar_year"), systemImage: "square.grid.3x3") }.accessibilityIdentifier("calendarYear")
                    }
                    Button { calendarOptions = state.settings.calendar; options = true } label: { Label(L("calendar_options"), systemImage: "slider.horizontal.3") }.accessibilityIdentifier("calendarOptions")
                }
            }
            .onChange(of: state.calendarMonth) { value in
                if let value { go(to: Day.monthStart(value)); state.calendarMonth = nil }
            }
            .sheet(isPresented: $options) {
                NavigationStack {
                    Form {
                        Picker(L("calendar_weekStart"), selection: $calendarOptions.weekStart) {
                            Text(L("calendar_weekMonday")).tag("monday"); Text(L("calendar_weekSunday")).tag("sunday")
                        }
                        Toggle(L("calendar_showTotals"), isOn: $calendarOptions.showDayTotals)
                    }.scrollContentBackground(.hidden).appScreen().navigationTitle(L("calendar_options"))
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) { SheetCloseButton() }
                            ToolbarItem(placement: .confirmationAction) { ActionButton(title: L("common_done"), iconOnly: true) {
                            try await services.repository.setSetting("calendar.settings", value: calendarOptions); state.settings.calendar = calendarOptions; options = false
                        } } }
                }.presentationDetents([.medium]).appSheet()
            }
    }
    private func go(to target: Date) {
        if !months.contains(target) { pageAnchor = target; month = target }
        else { withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.3)) { month = target } }
    }
}

private struct CalendarMonthPage: View {
    let month: Date
    @Binding var state: SceneState
    let services: AppServices
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.locale) private var locale
    @State private var selected = Day.today()
    @State private var events: [CalendarEvent] = []
    @State private var surroundingEvents: [CalendarEvent] = []
    @State private var previousTotal = 0.0
    @State private var error: String?
    private var currency: String { state.presentation.preferences.preferredCurrency }
    private var firstOffset: Int { (Day.utc.component(.weekday, from: month) - (state.settings.calendar.weekStart == "monday" ? 2 : 1) + 7) % 7 }
    private var days: Int { Day.utc.range(of: .day, in: .month, for: month)!.count }
    private var weekdayLabels: [String] {
        var calendar = Day.utc; calendar.locale = locale
        let symbols = calendar.shortStandaloneWeekdaySymbols
        return state.settings.calendar.weekStart == "monday" ? Array(symbols.dropFirst()) + [symbols[0]] : symbols
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                monthTotal.padding(.horizontal, 4)
                if typeSize.isAccessibilitySize {
                    DatePicker(L("native_date"), selection: $selected, in: month...Day.shift(Day.month(month, offset: 1), days: -1), displayedComponents: .date).environment(\.timeZone, .gmt)
                } else {
                    Grid(horizontalSpacing: 3, verticalSpacing: 3) {
                        GridRow {
                            ForEach(0..<7, id: \.self) { Text(weekdayLabels[$0].uppercased()).appFont(10.5, weight: .semibold, relativeTo: .caption2).tracking(0.4).foregroundStyle(AppTheme.muted).padding(.bottom, 8).accessibilityHidden(true) }
                        }
                        ForEach(0..<((firstOffset + days + 6) / 7), id: \.self) { week in
                            GridRow {
                                ForEach(0..<7, id: \.self) { weekday in
                                    let index = week * 7 + weekday
                                    let day = Day.shift(month, days: index - firstOffset)
                                    dayButton(day, adjacent: index < firstOffset || index >= firstOffset + days)
                                }
                            }
                        }
                    }.frame(maxWidth: .infinity)
                }
                AppDivider().padding(.vertical, 2)
                if events.isEmpty { Text(L("native_noRenewals")).appFont(14).foregroundStyle(AppTheme.muted).frame(maxWidth: .infinity).padding(.vertical, 28) }
                if !earlierEvents.isEmpty {
                    ViewThatFits(in: .horizontal) {
                        HStack { Text(L("calendar_earlier")); Spacer(); earlierTotal }
                        VStack(alignment: .leading, spacing: 4) { Text(L("calendar_earlier")); earlierTotal }
                    }.appFont(13).foregroundStyle(AppTheme.muted).padding(.horizontal, 6)
                }
                ForEach(agendaDays, id: \.self) { day in
                    let dayEvents = events.filter { $0.date == day }
                    VStack(spacing: 0) {
                        agendaHeading(day, events: dayEvents).padding(.horizontal, 6).padding(.top, 6).padding(.bottom, 4)
                        ForEach(dayEvents) { event in
                            NavigationLink(value: Route.subscription(event.subscriptionId)) {
                                EventCell(event: event, currency: currency, logos: services.logos, showDate: false).padding(.vertical, 10)
                            }.buttonStyle(.plain)
                        }
                    }
                }
                if let error { Text(error).foregroundStyle(AppTheme.muted) }
            }.padding(.horizontal, 12).padding(.top, 4).padding(.bottom, 24)
        }.onAppear { selected = max(month, min(Day.today(), Day.shift(Day.month(month, offset: 1), days: -1))) }
        .task(id: "\(Day.key(month)):\(state.presentation.revision):\(currency)") {
            do {
                let rates = try await services.exchange.cached()
                let result = try await services.repository.calendar(from: Day.month(month, offset: -1), through: Day.shift(Day.month(month, offset: 2), days: -1), rates: rates, now: Date())
                try Task.checkCancellation()
                previousTotal = result.filter { $0.date < month && $0.kind == .payment }.reduce(0) { $0 + $1.amount }
                surroundingEvents = result
                events = result.filter { $0.date >= month && $0.date < Day.month(month, offset: 1) }; error = nil
            } catch is CancellationError { } catch { self.error = Display.error(error) }
        }
    }
    private var eventDays: [Date] { Set(events.map(\.date)).sorted() }
    private var agendaDays: [Date] {
        let upcoming = eventDays.filter { $0 >= Day.today() }
        return upcoming.isEmpty ? eventDays : upcoming
    }
    private var earlierEvents: [CalendarEvent] {
        eventDays.contains(where: { $0 >= Day.today() }) ? events.filter { $0.date < Day.today() } : []
    }
    private var earlierTotal: some View {
        Text(L("calendar_earlierTotal", ["amount": Display.money(earlierEvents.filter { $0.kind == .payment }.reduce(0) { $0 + $1.amount }, currency)])).fontWeight(.semibold)
    }
    private func isHeavy(_ dayEvents: [CalendarEvent]) -> Bool {
        let payments = dayEvents.filter { $0.kind == .payment }
        let total = events.filter { $0.kind == .payment }.reduce(0) { $0 + $1.amount }
        return state.settings.pro && total > 0 && payments.count >= 2 && payments.reduce(0, { $0 + $1.amount }) >= total * 0.25
    }
    private func agendaHeading(_ day: Date, events: [CalendarEvent]) -> some View {
        let payments = events.filter { $0.kind == .payment }
        let heavy = isHeavy(events)
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 3)) : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 8))
        return layout {
            Text(day.formatted(Date.FormatStyle(timeZone: .gmt).weekday(.abbreviated).day())).appFont(15, weight: .bold)
            if day >= Day.today(), day < Day.shift(Day.today(), days: 14) {
                Text(Display.when(day)).appFont(13).foregroundStyle(day == Day.today() ? AppTheme.accent : AppTheme.muted)
            }
            if heavy { Text(L("calendar_heavyDay", ["count": String(payments.count)])).appFont(13).foregroundStyle(AppTheme.warning) }
            if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
            if payments.count > 1 {
                Text(Display.money(payments.reduce(0) { $0 + $1.amount }, currency)).appFont(13.5, weight: .semibold).foregroundStyle(heavy ? AppTheme.warning : AppTheme.muted)
            }
        }.foregroundStyle(AppTheme.muted).frame(maxWidth: .infinity, alignment: .leading)
    }
    private var monthTotal: some View {
        let total = events.filter { $0.kind == .payment }.reduce(0) { $0 + $1.amount }
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 6)) : AnyLayout(HStackLayout(spacing: 12))
        return layout {
            VStack(alignment: .leading, spacing: 4) {
                AppCaption(title: L("calendar_monthTotal"))
                if state.settings.pro, total.rounded() != previousTotal.rounded() {
                    let delta = total.rounded() - previousTotal.rounded()
                    Label(L(delta > 0 ? "home_deltaMore" : "home_deltaLess", ["amount": Display.money(abs(delta), currency, decimals: 0)]), systemImage: delta > 0 ? "arrow.up" : "arrow.down")
                        .appFont(12.5, weight: .bold).foregroundStyle(delta > 0 ? AppTheme.danger : AppTheme.accentBright)
                }
            }.frame(maxWidth: .infinity, alignment: .leading)
            Text(Display.money(total, currency)).appFont(20, weight: .bold).monospacedDigit()
        }
    }
    private func dayButton(_ day: Date, adjacent: Bool) -> some View {
        let dayEvents = surroundingEvents.filter { $0.date == day }
        let amount = dayEvents.filter { $0.kind == .payment }.reduce(0) { $0 + $1.amount }
        let today = day == Day.today()
        let past = day < Day.today()
        let heavy = !adjacent && isHeavy(dayEvents)
        let fill = adjacent || dayEvents.isEmpty ? Color.clear : heavy ? AppTheme.warning.opacity(0.14) : past ? Color(hex: 0x131519) : AppTheme.surface
        let border = today ? AppTheme.accent.opacity(0.5) : heavy ? AppTheme.warning : adjacent || dayEvents.isEmpty ? .clear : past ? Color.white.opacity(0.06) : AppTheme.border
        let tile = VStack(spacing: 4) {
                Text(String(Day.utc.component(.day, from: day))).appFont(12.5, weight: .semibold, relativeTo: .caption)
                    .foregroundStyle(today ? AppTheme.accentBright : adjacent ? AppTheme.muted.opacity(0.55) : past ? AppTheme.muted : AppTheme.text)
                if !dayEvents.isEmpty {
                    HStack(spacing: 2) {
                        ForEach(dayEvents.prefix(dayEvents.count > 2 ? 1 : 2)) { event in
                            BrandIcon(name: event.name, domain: event.domain, logos: services.logos, size: state.settings.calendar.showDayTotals ? 20 : dayEvents.count == 1 ? 30 : 22, dimmed: past || adjacent)
                        }
                        if dayEvents.count > 2 { Text("+\(dayEvents.count - 1)").appFont(10, weight: .bold).foregroundStyle(AppTheme.muted) }
                    }
                    if state.settings.calendar.showDayTotals, amount > 0, !adjacent {
                        Text(Display.money(amount, currency, decimals: 0)).appFont(10, weight: .bold, relativeTo: .caption2).foregroundStyle(past ? AppTheme.muted : AppTheme.text).lineLimit(1).minimumScaleFactor(0.75)
                    }
                }
                Spacer(minLength: 0)
            }.padding(.top, 6).padding(.bottom, 5).frame(maxWidth: .infinity).frame(height: 66)
                .appCard(radius: 13, fill: fill, border: border)
        let ids = Set(dayEvents.map(\.subscriptionId))
        return Group {
            if let id = ids.first {
                NavigationLink(value: ids.count == 1 ? Route.subscription(id) : Route.due(Day.key(day))) { tile }
                    .accessibilityIdentifier("calendar-day-" + Day.key(day))
            } else { tile }
        }.buttonStyle(.plain).accessibilityLabel(Display.date(day, long: true) + ", " + Display.money(amount, currency))
    }
}

struct YearView: View {
    let year: Int
    @Binding var state: SceneState
    let services: AppServices
    @State private var events: [CalendarEvent] = []
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.dismiss) private var dismiss
    private var currency: String { state.presentation.preferences.preferredCurrency }
    private var dayTotals: [Date: Double] {
        Dictionary(grouping: events.filter { $0.kind == .payment }, by: \.date).mapValues { $0.reduce(0) { $0 + $1.amount } }
    }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                ViewThatFits(in: .horizontal) {
                    HStack { AppCaption(title: L("calendar_yearTotal")); Spacer(); total }
                    VStack(alignment: .leading, spacing: 6) { AppCaption(title: L("calendar_yearTotal")); total }
                }.padding(.horizontal, 2)
                let columns = typeSize.isAccessibilitySize ? 1 : 3
                let totals = dayTotals
                let maximum = totals.values.max() ?? 0
                Grid(horizontalSpacing: 0, verticalSpacing: 0) {
                    ForEach(0..<(12 / columns), id: \.self) { row in
                        GridRow {
                            ForEach(0..<columns, id: \.self) { column in
                                miniMonth(row * columns + column + 1, totals: totals, maximum: maximum)
                            }
                        }
                    }
                }.frame(maxWidth: .infinity)
                Text(L("calendar_yearHint")).appFont(12.5).foregroundStyle(AppTheme.muted).padding(.horizontal, 2)
            }.padding(.horizontal, 16).padding(.top, 8).padding(.bottom, 32)
        }.appScreen().navigationTitle(String(year))
            .task {
                do { events = try await services.repository.calendar(from: Day.parse("\(year)-01-01")!, through: Day.parse("\(year)-12-31")!, rates: services.exchange.cached(), now: Date()) }
                catch { state.notice = Notice(title: L("native_error"), message: Display.error(error)) }
            }
    }
    private var total: some View { Text(Display.money(dayTotals.values.reduce(0, +), currency)).appFont(20, weight: .bold).monospacedDigit() }
    private func miniMonth(_ month: Int, totals: [Date: Double], maximum: Double) -> some View {
        let first = Day.parse(String(format: "%04d-%02d-01", year, month))!
        let count = Day.utc.range(of: .day, in: .month, for: first)!.count
        let offset = (Day.utc.component(.weekday, from: first) - (state.settings.calendar.weekStart == "monday" ? 2 : 1) + 7) % 7
        let sum = (0..<count).reduce(0) { $0 + (totals[Day.shift(first, days: $1)] ?? 0) }
        return Button {
            state.calendarMonth = first; dismiss()
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                Text(first.formatted(Date.FormatStyle(timeZone: .gmt).month(.wide)).localizedCapitalized).appFont(12.5, weight: .bold).lineLimit(typeSize.isAccessibilitySize ? nil : 1)
                Grid(horizontalSpacing: 2, verticalSpacing: 2) {
                    ForEach(0..<6, id: \.self) { week in
                        GridRow {
                            ForEach(0..<7, id: \.self) { weekday in
                                let index = week * 7 + weekday - offset
                                let amount = totals[Day.shift(first, days: index)] ?? 0
                                let shade = [0.22, 0.42, 0.68, 1.0][min(3, max(0, Int(ceil(amount / max(1, maximum) * 4)) - 1))]
                                RoundedRectangle(cornerRadius: 3).fill(index < 0 || index >= count ? .clear : amount > 0 ? AppTheme.accent.opacity(shade) : AppTheme.border).frame(width: 13, height: 13)
                            }
                        }
                    }
                }.accessibilityHidden(true)
                Text(sum > 0 ? Display.money(sum, currency, decimals: 0) : "—").appFont(11, relativeTo: .caption2).foregroundStyle(AppTheme.muted).monospacedDigit()
            }.padding(.horizontal, 4).padding(.vertical, 8).frame(maxWidth: .infinity, alignment: .leading)
        }.buttonStyle(.plain).accessibilityLabel(first.formatted(Date.FormatStyle(timeZone: .gmt).month(.wide)) + ", " + Display.money(sum, currency))
    }
}
