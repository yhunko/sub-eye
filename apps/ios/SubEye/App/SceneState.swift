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
    var remindersOfferPending = false
    var calendarMonth: Date?
}

@available(iOS 17, *)
@MainActor @Observable
final class SceneModel {
    var state: SceneState
    init(presentation: Presentation) { state = SceneState(presentation: presentation) }
}

enum AppTab: String, Hashable { case home, subscriptions, calendar, settings }
enum Route: Hashable {
    case subscription(String)
    case due(String)
    case cancellationDay(String)
    case selection([String])
    case categories
    case notifications
    case year(Int)
    case legal(String)
}

enum SheetRoute: Identifiable {
    case editor(Subscription?)
    case paywall
    case pricing(SubscriptionRow)
    case lifecycle(SubscriptionRow, LifecycleAction)
    case category(SubEyeCore.Category?)
    case cancellation(String)
    case prompt(UserPrompt)
    var id: String {
        switch self {
        case .editor(let sub): "edit:" + (sub?.id ?? "new")
        case .paywall: "paywall"
        case .pricing(let row): "pricing:" + row.id
        case .lifecycle(let row, let action): action.rawValue + row.id
        case .category(let category): "category:" + (category?.id ?? "new")
        case .cancellation(let id): "cancellation:" + id
        case .prompt(let prompt): "prompt:" + prompt.rawValue
        }
    }
}

enum DeepLink {
    static func route(_ url: URL) -> (AppTab?, Route?, SheetRoute?)? {
        guard url.scheme == AppConfiguration.scheme else { return nil }
        let parts = ([url.host].compactMap { $0 }.filter { !$0.isEmpty }) + url.pathComponents.filter { $0 != "/" }
        if parts.first == "subscriptions" {
            if parts.count > 2, parts[1] == "due", Day.parse(parts[2]) != nil {
                let planning = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.contains { $0.name == "action" && $0.value == "plan-cancellation" } == true
                return (.subscriptions, planning ? .cancellationDay(parts[2]) : .due(parts[2]), nil)
            }
            if parts.count > 1 {
                let planning = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.contains { $0.name == "action" && $0.value == "plan-cancellation" } == true
                return (.subscriptions, .subscription(parts[1]), planning ? .cancellation(parts[1]) : nil)
            }
            let ids = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "ids" }?.value?.split(separator: ",").map(String.init)
            return (.subscriptions, ids.map(Route.selection), nil)
        }
        if parts.first == "paywall" { return (nil, nil, .paywall) }
        if parts.first == "legal", let kind = parts.last { return (.settings, .legal(kind), nil) }
        if parts.first == "calendar" { return (.calendar, nil, nil) }
        if parts.first == "settings" { return (.settings, parts.last == "notifications" ? .notifications : nil, nil) }
        return nil
    }
}
