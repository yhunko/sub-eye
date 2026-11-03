import SwiftUI
import SubEyeCore

struct InstallmentsList: View {
    let rows: [InstallmentRow]
    let search: String
    let logos: LogoService
    var selected: String?
    private var matching: [InstallmentRow] {
        let query = search.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else { return rows }
        return rows.filter { row in
            [row.plan.name, row.plan.lenderName].contains { $0?.localizedCaseInsensitiveContains(query) == true }
        }
    }
    private var active: [InstallmentRow] {
        matching.filter { !$0.finished }.sorted { ($0.nextDate ?? .distantFuture) < ($1.nextDate ?? .distantFuture) }
    }
    private var paidOff: [InstallmentRow] {
        matching.filter(\.finished).sorted { ($0.endDate ?? .distantPast) > ($1.endDate ?? .distantPast) }
    }
    var body: some View {
        if matching.isEmpty { Text(L("subs_emptyFiltered")).appFont(14).foregroundStyle(AppTheme.muted).padding(.vertical, 48) }
        section(L("installments_active"), active)
        section(L("installment_paidOff"), paidOff)
    }
    @ViewBuilder private func section(_ title: String, _ rows: [InstallmentRow]) -> some View {
        if !rows.isEmpty {
            Text(title).appFont(15, weight: .bold).foregroundStyle(AppTheme.muted).frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 6).padding(.top, 14).accessibilityAddTraits(.isHeader)
            ForEach(rows) { row in
                RouteLink(value: Route.installment(row.id)) { InstallmentCell(row: row, logos: logos) }
                    .buttonStyle(.plain).accessibilityIdentifier("installment-" + row.id)
                    .overlay { if row.id == selected { RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(AppTheme.accent, lineWidth: 2) } }
                    .accessibilityAddTraits(row.id == selected ? .isSelected : [])
            }
        }
    }
}
