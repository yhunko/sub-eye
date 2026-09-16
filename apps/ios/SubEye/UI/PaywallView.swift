import RevenueCat
import SwiftUI
import SubEyeCore

struct PaywallView: View {
    @Binding var state: SceneState
    let services: AppServices
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var package: Package?
    @State private var loaded = false
    @State private var result: String?
    @State private var page = 0
    @ScaledMetric private var captionHeight: CGFloat = 112
    private let features = ["Reminders", "Calendar", "Pricing", "Categories", "Widgets"]
    private let icons = ["bell.badge", "calendar", "tag", "chart.pie", "square.grid.2x2"]
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text(L("paywall_subtitle")).appFont(24, weight: .heavy, relativeTo: .title2).tracking(-0.3)
                    if typeSize.isAccessibilitySize {
                        ForEach(0..<features.count, id: \.self) { feature($0) }
                        purchase
                    } else {
                        TabView(selection: $page) {
                            ForEach(0..<features.count, id: \.self) { feature($0).tag($0) }
                        }.tabViewStyle(.page(indexDisplayMode: .never)).frame(height: 220 + captionHeight)
                        HStack(spacing: 6) {
                            ForEach(0..<features.count, id: \.self) { index in Circle().fill(index == page ? AppTheme.accent : Color.white.opacity(0.16)).frame(width: 6, height: 6) }
                        }.frame(maxWidth: .infinity).accessibilityHidden(true)
                    }
                }.padding(.horizontal, 20).padding(.top, 14).padding(.bottom, 16)
            }.appScreen().navigationTitle(L("paywall_title"))
                .safeAreaInset(edge: .bottom) {
                    if !typeSize.isAccessibilitySize { purchase.padding(.horizontal, 20).padding(.top, 6).padding(.bottom, 14).background(AppTheme.background) }
                }
                .toolbar { ToolbarItem(placement: .cancellationAction) { SheetCloseButton() } }
                .task { package = try? await services.purchases.offering(); loaded = true }
        }.appSheet()
    }
    private func feature(_ index: Int) -> some View {
        VStack(spacing: 13) {
            ProFeaturePreview(index: index).frame(maxWidth: .infinity).frame(height: 220).appCard().accessibilityHidden(true)
            Label(L(index == 4 ? "paywall_lockWidgets" : "paywall_feature" + features[index]), systemImage: icons[index]).appFont(16.5, weight: .bold).labelStyle(.titleAndIcon)
            Text(L(index == 4 ? "paywall_lockWidgetsBody" : "paywall_feature" + features[index] + "Body")).appFont(13.5).foregroundStyle(AppTheme.muted).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true).frame(maxWidth: 320)
            Spacer(minLength: 0)
        }
    }
    private var purchase: some View {
        VStack(spacing: 12) {
            Text(L("paywall_featureSupportBody")).appFont(12.5).foregroundStyle(AppTheme.muted).multilineTextAlignment(.center)
            if state.settings.pro { Text(L("paywall_owned")).appFont(15, weight: .semibold).foregroundStyle(AppTheme.accentBright).padding(.vertical, 12) }
            else if let package {
                ActionButton(title: L("paywall_buy", ["price": package.localizedPriceString])) {
                    do {
                        if let entitled = try await services.purchases.purchase(package) {
                            state.settings.pro = entitled; state.reload += 1
                            if entitled { dismiss() } else { result = L("native_purchaseError") }
                        }
                    } catch { result = L("native_purchaseError") }
                }.buttonStyle(AppPrimaryButtonStyle())
                Text(L("paywall_oneTime")).appFont(12.5).foregroundStyle(AppTheme.muted)
            } else if loaded { Text(L("paywall_unavailable")).appFont(12.5).foregroundStyle(AppTheme.muted) }
            else { ProgressView().padding(.vertical, 14) }
            ActionButton(title: L("paywall_restore")) {
                do {
                    let restored = try await services.purchases.restore(); state.settings.pro = restored; state.reload += 1
                    result = L(restored ? "paywall_restoreDone" : "paywall_restoreNone")
                } catch { result = L("paywall_restoreFailed") }
            }.appFont(14, weight: .semibold).foregroundStyle(AppTheme.muted).frame(minHeight: 44)
            if let result { Text(result).appFont(13).foregroundStyle(AppTheme.muted) }
            let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: 12)) : AnyLayout(HStackLayout(spacing: 8))
            layout {
                NavigationLink(L("settings_terms")) { LegalView(kind: "terms-of-service") }
                if !typeSize.isAccessibilitySize { Text("·") }
                NavigationLink(L("settings_privacy")) { LegalView(kind: "privacy-policy") }
            }.appFont(13).foregroundStyle(AppTheme.muted).frame(minHeight: 44)
        }.frame(maxWidth: .infinity)
    }
}

private struct ProFeaturePreview: View {
    let index: Int
    var body: some View {
        switch index {
        case 0:
            HStack(spacing: 11) {
                Image(systemName: "eye.fill").font(.system(size: 17)).foregroundStyle(AppTheme.accent).frame(width: 34, height: 34).appCard(radius: 9, fill: AppTheme.background)
                VStack(alignment: .leading, spacing: 2) {
                    Text("SubEye").font(.system(size: 13, weight: .bold))
                    Text(L("home_attnPayment", ["when": L("when_tomorrow").lowercased()])).font(.system(size: 13)).foregroundStyle(AppTheme.muted)
                }.frame(maxWidth: .infinity, alignment: .leading)
            }.padding(.horizontal, 14).padding(.vertical, 13).appCard(radius: 20, fill: AppTheme.surfaceAlt, border: Color.white.opacity(0.16)).padding(.horizontal, 24)
        case 1:
            VStack(spacing: 10) {
                HStack { Capsule().fill(Color.white.opacity(0.16)).frame(width: 62, height: 9); Spacer(); Capsule().fill(AppTheme.border).frame(width: 38, height: 7) }
                Grid(horizontalSpacing: 4, verticalSpacing: 4) {
                    ForEach(0..<5, id: \.self) { week in
                        GridRow {
                            ForEach(0..<7, id: \.self) { day in
                                let slot = week * 7 + day
                                let heat: [Int: Double] = [3: 0.22, 8: 0.42, 11: 0.22, 16: 0.68, 17: 0.22, 22: 0.42, 25: 0.22]
                                RoundedRectangle(cornerRadius: 4).fill(slot == 30 ? AppTheme.warning.opacity(0.1) : heat[slot].map { AppTheme.accent.opacity($0) } ?? AppTheme.border)
                                    .frame(width: 24, height: 14).overlay { if slot == 30 { RoundedRectangle(cornerRadius: 4).strokeBorder(AppTheme.warning) } }
                            }
                        }
                    }
                }
            }.frame(width: 196)
        case 2:
            HStack(alignment: .bottom, spacing: 10) {
                ForEach(Array([26.0, 46, 74].enumerated()), id: \.offset) { index, height in
                    RoundedRectangle(cornerRadius: 9).fill(index == 0 ? AppTheme.accent.opacity(0.14) : AppTheme.surfaceAlt)
                        .frame(width: 46, height: height).overlay { RoundedRectangle(cornerRadius: 9).strokeBorder(index == 0 ? AppTheme.accent.opacity(0.5) : AppTheme.border) }
                }
            }
        case 3:
            VStack(alignment: .leading, spacing: 14) {
                ForEach(0..<3, id: \.self) { index in
                    HStack(spacing: 10) {
                        Circle().fill(AppTheme.categoryColors[index]).frame(width: 9, height: 9)
                        Capsule().fill(AppTheme.categoryColors[index]).frame(width: [210.0, 143, 86][index], height: 11)
                    }
                }
            }
        default:
            VStack(alignment: .leading, spacing: 8) {
                Capsule().fill(AppTheme.border).frame(width: 52, height: 7)
                RoundedRectangle(cornerRadius: 6).fill(AppTheme.text).frame(width: 108, height: 19)
                AppDivider().padding(.vertical, 2)
                ForEach(0..<2, id: \.self) { _ in
                    HStack(spacing: 8) {
                        Circle().fill(AppTheme.accent.opacity(0.14)).frame(width: 15, height: 15)
                        Capsule().fill(AppTheme.border).frame(height: 7)
                        Capsule().fill(AppTheme.muted).frame(width: 30, height: 7)
                    }
                }
            }.padding(15).frame(width: 176).appCard(radius: 20, fill: AppTheme.surfaceAlt, border: Color.white.opacity(0.16))
        }
    }
}
