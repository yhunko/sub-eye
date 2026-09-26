import SwiftUI
import SubEyeCore

enum AppTheme {
    static let background = Color(hex: 0x0f1115)
    static let surface = Color(hex: 0x171a20)
    static let surfaceAlt = Color(hex: 0x1f232b)
    static let text = Color(hex: 0xf2f4f8)
    static let muted = Color(hex: 0x98a0ae)
    static let border = Color.white.opacity(0.10)
    static let accent = Color(hex: 0x33a453)
    static let accentBright = Color(hex: 0x6fd98c)
    static let danger = Color(hex: 0xf87171)
    static let warning = Color(hex: 0xe0a32e)
    static let categoryColors: [Color] = [0xe8834e, 0x34c759, 0xc15cff, 0xd4d640, 0x4a9eff, 0xf0507e, 0x43d17a].map { Color(hex: $0) }

    static func rowFill(_ status: SubscriptionStatus) -> Color {
        switch status {
        case .active: surface
        case .paused: Color(hex: 0x3c3421)
        case .cancelling: Color(hex: 0x3b2d25)
        case .cancelled: Color(hex: 0x131519)
        }
    }
    static func rowBorder(_ status: SubscriptionStatus) -> Color {
        switch status {
        case .active: border
        case .paused: Color(hex: 0xfbbf24).opacity(0.34)
        case .cancelling: Color(hex: 0xf9923c).opacity(0.36)
        case .cancelled: Color.white.opacity(0.06)
        }
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
    }
}

private struct AppFont: ViewModifier {
    @ScaledMetric private var size: CGFloat
    let weight: Font.Weight
    init(size: CGFloat, weight: Font.Weight, relativeTo: Font.TextStyle) {
        _size = ScaledMetric(wrappedValue: size, relativeTo: relativeTo); self.weight = weight
    }
    func body(content: Content) -> some View { content.font(.system(size: size, weight: weight)) }
}

extension View {
    func appFont(_ size: CGFloat, weight: Font.Weight = .regular, relativeTo: Font.TextStyle = .body) -> some View {
        modifier(AppFont(size: size, weight: weight, relativeTo: relativeTo))
    }
    func appCard(radius: CGFloat = 24, fill: Color = AppTheme.surface, border: Color = AppTheme.border) -> some View {
        background(fill, in: RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay { RoundedRectangle(cornerRadius: radius, style: .continuous).strokeBorder(border, lineWidth: 1) }
    }
    func appScreen() -> some View {
        background(AppTheme.background.ignoresSafeArea())
            .foregroundStyle(AppTheme.text)
            .navigationBarTitleDisplayMode(.inline)
    }
    func appSheet(dismissible: Bool = true) -> some View {
        presentationDragIndicator(dismissible ? .visible : .hidden).presentationCornerRadius(32)
    }
}

struct SheetCloseButton: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        Button { dismiss() } label: { Label(L("common_cancel"), systemImage: "xmark") }
            .labelStyle(.iconOnly).tint(AppTheme.text)
    }
}

struct GlassIconButton: View {
    let title: String
    let icon: String
    let action: () -> Void
    var body: some View {
        if #available(iOS 26, *) {
            button.buttonStyle(.glass).buttonBorderShape(.circle).frame(width: 44, height: 44)
        } else {
            button.buttonStyle(.plain).frame(width: 44, height: 44).background(.ultraThinMaterial, in: Circle())
        }
    }
    private var button: some View {
        Button(action: action) { Image(systemName: icon).font(.system(size: 18, weight: .semibold)) }
            .tint(AppTheme.text).accessibilityLabel(title)
    }
}

struct AppSection<Content: View>: View {
    var title: String? = nil
    var footnote: String? = nil
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let title { AppCaption(title: title).padding(.horizontal, 16) }
            VStack(spacing: 0) { content }.frame(maxWidth: .infinity, alignment: .leading).appCard()
            if let footnote { Text(footnote).appFont(12.5, relativeTo: .footnote).foregroundStyle(AppTheme.muted).padding(.horizontal, 16).fixedSize(horizontal: false, vertical: true) }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct AppCaption: View {
    let title: String
    var body: some View { Text(title.uppercased()).appFont(12.5, relativeTo: .caption).tracking(0.6).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true) }
}

struct AppDivider: View {
    var inset: CGFloat = 0
    var body: some View { Rectangle().fill(AppTheme.border).frame(height: 0.5).padding(.leading, inset).accessibilityHidden(true) }
}

struct SettingsRow: View {
    var icon: String? = nil
    let title: String
    var value: String? = nil
    var color: Color = AppTheme.text
    var chevron = true
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        HStack(spacing: 12) {
            if let icon { Image(systemName: icon).appFont(19).foregroundStyle(color == AppTheme.text ? AppTheme.muted : color).frame(width: 19).accessibilityHidden(true) }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).foregroundStyle(color).fixedSize(horizontal: false, vertical: true)
                if typeSize.isAccessibilitySize, let value { Text(value).foregroundStyle(AppTheme.muted).fixedSize(horizontal: false, vertical: true) }
            }.frame(maxWidth: .infinity, alignment: .leading)
            if !typeSize.isAccessibilitySize, let value { Text(value).foregroundStyle(AppTheme.muted).lineLimit(1) }
            if chevron { Image(systemName: "chevron.right").appFont(13, weight: .semibold).foregroundStyle(AppTheme.muted).accessibilityHidden(true) }
        }.appFont(16).padding(.horizontal, 16).padding(.vertical, 8).frame(minHeight: 44).contentShape(Rectangle())
    }
}

struct SpendTrack: View {
    let progress: Double
    var height: CGFloat = 8
    var color: Color = AppTheme.text
    var body: some View {
        GeometryReader { geometry in
            Capsule().fill(AppTheme.surfaceAlt)
                .overlay(alignment: .leading) { Capsule().fill(color).frame(width: geometry.size.width * min(1, max(0.03, progress))) }
        }.frame(height: height).accessibilityHidden(true)
    }
}

struct AddSubscriptionButton: View {
    let action: () -> Void
    var body: some View {
        if #available(iOS 17, *) { button.buttonBorderShape(.circle) }
        else { button.buttonBorderShape(.capsule) }
    }
    private var button: some View {
        Button(action: action) { Label(L("subs_add"), systemImage: "plus") }
            .labelStyle(.iconOnly).buttonStyle(.borderedProminent)
            .tint(AppTheme.accent).foregroundStyle(AppTheme.background).accessibilityIdentifier("addSubscription")
    }
}

struct AppPrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.appFont(16, weight: .semibold).frame(maxWidth: .infinity, minHeight: 50)
            .foregroundStyle(AppTheme.background).background(AppTheme.accent, in: RoundedRectangle(cornerRadius: 14))
            .opacity(enabled ? configuration.isPressed ? 0.7 : 1 : 0.45)
    }
}

struct FormField<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8)) : AnyLayout(HStackLayout(spacing: 12))
        layout {
            Text(title).fixedSize(horizontal: false, vertical: true)
            content.frame(maxWidth: .infinity, alignment: typeSize.isAccessibilitySize ? .leading : .trailing)
        }.appFont(16).padding(.horizontal, 16).padding(.vertical, 12).frame(minHeight: 56)
    }
}
