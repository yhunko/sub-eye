import Foundation
import Observation
import SubEyeCore

struct Notice: Identifiable {
    var id = UUID()
    var title: String
    var message: String
}

struct DeviceSettings: Equatable {
    var reminders = ReminderSettings()
    var list = ListOptions()
    var calendar = CalendarOptions()
    var liveActivities = false
    var cloud = false
    var pro = false
}

struct SceneState {
    var presentation: Presentation
    var settings = DeviceSettings()
    var ready = false
    var notice: Notice?
    var reload = 0
    var serviceIssue: String?
    var update: AppUpdate?
    var calendarMonth: Date?
    var notificationsAllowed: Bool?
    var listSegment = ListSegment.subscriptions
    // A stale link or deleting the last plan must never leave the tab on a segment whose switch is hidden.
    var effectiveSegment: ListSegment { presentation.installmentCount > 0 ? listSegment : .subscriptions }
}

@available(iOS 17, *)
@MainActor @Observable
final class SceneModel {
    var state: SceneState
    init(presentation: Presentation) { state = SceneState(presentation: presentation) }
}

enum AppTab: String, Hashable { case home, subscriptions, calendar, settings }
enum ListSegment: String, Hashable { case subscriptions, installments }
enum Route: Hashable {
    case subscription(String)
    case installment(String)
    case due(String)
    case cancellationDay(String)
    case selection([String])
    case saved
    case categories
    case currency
    case notifications
    case year(Int)
    case legal(String)
    #if NATIVE_DEVELOPMENT
    case developer
    case developerScenario(DeveloperScenario)
    #endif
}

enum SheetRoute: Identifiable {
    case editor(Subscription?, SubscriptionEditor.Flow = .subscription)
    case paywall
    case pricing(SubscriptionRow)
    case lifecycle(SubscriptionRow, LifecycleAction)
    case category(SubEyeCore.Category?)
    case cancellation(String)
    case prompt(UserPrompt)
    case installmentEditor(InstallmentPlan?)
    case installmentPayoff(String)
    var id: String {
        switch self {
        case .editor(let sub, let flow): "edit:" + (sub?.id ?? "new-" + flow.rawValue)
        case .paywall: "paywall"
        case .pricing(let row): "pricing:" + row.id
        case .lifecycle(let row, let action): action.rawValue + row.id
        case .category(let category): "category:" + (category?.id ?? "new")
        case .cancellation(let id): "cancellation:" + id
        case .prompt(let prompt): "prompt:" + prompt.rawValue
        case .installmentEditor(let plan): "installment:" + (plan?.id ?? "new")
        case .installmentPayoff(let id): "installmentPayoff:" + id
        }
    }
}

enum DeepLink {
    struct Target {
        var tab: AppTab?
        var route: Route? = nil
        var sheet: SheetRoute? = nil
        var segment: ListSegment? = nil
    }
    static func route(_ url: URL) -> Target? {
        guard url.scheme == AppConfiguration.scheme else { return nil }
        let parts = ([url.host].compactMap { $0 }.filter { !$0.isEmpty }) + url.pathComponents.filter { $0 != "/" }
        if parts.first == "subscriptions" {
            if parts.count > 2, parts[1] == "due", Day.parse(parts[2]) != nil {
                let planning = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.contains { $0.name == "action" && $0.value == "plan-cancellation" } == true
                return Target(tab: .subscriptions, route: planning ? .cancellationDay(parts[2]) : .due(parts[2]), segment: .subscriptions)
            }
            if parts.count > 1 {
                let planning = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.contains { $0.name == "action" && $0.value == "plan-cancellation" } == true
                if planning { return Target(tab: .subscriptions, sheet: .cancellation(parts[1])) }
                return Target(tab: .subscriptions, route: .subscription(parts[1]), segment: .subscriptions)
            }
            let ids = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "ids" }?.value?.split(separator: ",").map(String.init)
            return Target(tab: .subscriptions, route: ids.map(Route.selection), segment: ids == nil ? nil : .subscriptions)
        }
        if parts.first == "installments" { return Target(tab: .subscriptions, route: parts.count > 1 ? .installment(parts[1]) : nil, segment: .installments) }
        if parts.first == "paywall" { return Target(tab: nil, sheet: .paywall) }
        if parts.first == "legal", let kind = parts.last { return Target(tab: .settings, route: .legal(kind)) }
        if parts.first == "calendar" { return Target(tab: .calendar) }
        if parts.first == "settings" { return Target(tab: .settings, route: parts.last == "notifications" ? .notifications : nil) }
        #if NATIVE_DEVELOPMENT
        if parts.first == "developer" { return Target(tab: .settings, route: parts.count > 1 ? DeveloperScenario(rawValue: parts[1]).map(Route.developerScenario) : .developer) }
        #endif
        return nil
    }
}
