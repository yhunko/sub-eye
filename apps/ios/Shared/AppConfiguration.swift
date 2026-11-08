import Foundation
import SubEyeCore

enum AppConfiguration {
    static var group: String { Bundle.main.object(forInfoDictionaryKey: "SubEyeAppGroup") as? String ?? "group.cc.subeye.app" }
    static var namespace: String { Bundle.main.object(forInfoDictionaryKey: "SubEyeNamespace") as? String ?? "native" }
    static var scheme: String { Bundle.main.object(forInfoDictionaryKey: "SubEyeURLScheme") as? String ?? "subeye" }
    static var widgetKey: String { Bundle.main.object(forInfoDictionaryKey: "SubEyeWidgetKey") as? String ?? "snapshot" }
    static var directory: URL {
        get throws {
            guard let groupURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
                throw DomainError.invalidDocument("App Group is unavailable")
            }
            return groupURL.appendingPathComponent(namespace, isDirectory: true)
        }
    }
    static func repository() throws -> SubscriptionRepository {
        SubscriptionRepository(url: try directory.appendingPathComponent("SubEye.sqlite"),
                               defaults: Preferences(currency: Locale.current.currency?.identifier.lowercased() ?? "uah",
                                                     timezone: TimeZone.current.identifier))
    }
    static func url(_ path: String) -> URL {
        var components = URLComponents()
        components.scheme = scheme; components.host = ""; components.path = "/" + path
        return components.url!
    }
}
