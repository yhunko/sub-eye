import SwiftUI
import UIKit
import SubEyeCore

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 255) / 255, green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
    }
}

// Symbol names and tint tokens are stored with every plan and synced, so a shipped one can never be renamed or removed.
enum InstallmentStyle {
    static let symbols: [(name: String, purpose: String)] = [
        ("iphone", "phone"), ("laptopcomputer", "laptop"), ("car.fill", "car"), ("house.fill", "home"), ("sofa.fill", "furniture"),
        ("washer.fill", "appliance"), ("tv.fill", "tv"), ("graduationcap.fill", "education"), ("cross.case.fill", "health"),
        ("airplane", "travel"), ("gift.fill", "gift"), ("hammer.fill", "tools"), ("bicycle", "bike"), ("gamecontroller.fill", "games"),
        ("camera.fill", "camera"), ("tshirt.fill", "clothes"), ("pawprint.fill", "pet"), ("sparkles", "jewelry"),
        ("building.2.fill", "business"), ("bag.fill", "shopping"), ("cart.fill", "groceries"), ("banknote.fill", "cash"),
        ("creditcard.fill", "card"), ("ellipsis", "other")
    ]
    // Green leads because it is the app's accent, which an unknown token falls back to.
    static let tints: [(token: String, color: Color)] = [
        ("green", Color(hex: 0x33a453)), ("blue", Color(hex: 0x4a9eff)), ("teal", Color(hex: 0x2fb8c4)), ("purple", Color(hex: 0xc15cff)),
        ("pink", Color(hex: 0xf0507e)), ("red", Color(hex: 0xf87171)), ("orange", Color(hex: 0xe8834e)), ("yellow", Color(hex: 0xd4d640))
    ]
    static let defaultSymbol = "bag.fill"

    // A plan synced from a newer iOS can name a symbol this system does not have.
    static func symbol(_ name: String) -> String { UIImage(systemName: name) == nil ? "creditcard" : name }
    static func color(_ token: String) -> Color { tints.first { $0.token == token }?.color ?? tints[0].color }
}

extension InstallmentPlan {
    var installmentKind: InstallmentKind? { InstallmentKind(rawValue: kind) }
}
