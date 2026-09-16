import SwiftUI
import SubEyeCore

@main
struct SubEyeApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    private let services: AppServices?
    init() {
        Performance.signposts.emitEvent("ProcessLaunch")
        UINavigationBar.appearance().titleTextAttributes = [.foregroundColor: UIColor(AppTheme.text)]
        UITabBar.appearance().unselectedItemTintColor = UIColor(AppTheme.text)
        services = (try? AppConfiguration.directory).map { AppServices(directory: NativeTesting.directory($0)) }
    }
    var body: some Scene {
        WindowGroup {
            Group {
                if let services {
                    if #available(iOS 17, *) { ObservationRoot(services: services, inbox: delegate.inbox) }
                    else { LegacyRoot(services: services, inbox: delegate.inbox) }
                } else { Text(L("native_storeError")).padding() }
            }.modifier(TestingTextSize()).preferredColorScheme(.dark).tint(AppTheme.accent).foregroundStyle(AppTheme.text)
        }
    }
}

private struct TestingTextSize: ViewModifier {
    @ViewBuilder func body(content: Content) -> some View {
        if NativeTesting.largestText { content.environment(\.dynamicTypeSize, .accessibility5) }
        else { content }
    }
}

@available(iOS 17, *)
private struct ObservationRoot: View {
    let services: AppServices
    let inbox: NotificationInbox
    @State private var model: SceneModel
    init(services: AppServices, inbox: NotificationInbox) {
        self.services = services; self.inbox = inbox; _model = State(initialValue: SceneModel(presentation: services.initial))
    }
    var body: some View { MainShell(state: $model.state, services: services, inbox: inbox) }
}

private struct LegacyRoot: View {
    let services: AppServices
    let inbox: NotificationInbox
    @State private var state: SceneState
    init(services: AppServices, inbox: NotificationInbox) {
        self.services = services; self.inbox = inbox; _state = State(initialValue: SceneState(presentation: services.initial))
    }
    var body: some View { MainShell(state: $state, services: services, inbox: inbox) }
}
