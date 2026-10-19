import Foundation
import StoreKit
import SubEyeCore
import UIKit

struct AppUpdate: Equatable {
    var release: StoreRelease
    var banner: Bool
}

@MainActor
final class UpdateService {
    static let appID = 6795566917
    private let repository: SubscriptionRepository
    private var firstSession: Bool?
    init(repository: SubscriptionRepository) { self.repository = repository }

    func current(now: Date) async throws -> AppUpdate? {
        let firstSession = try await isFirstSession(now: now)
        guard let release = try await release(now: now) else { return nil }
        let installed = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        let system = UIDevice.current.systemVersion
        guard UpdatePolicy.available(release, installed: installed, system: system, now: now, firstSession: firstSession) else { return nil }
        let dismissed = try await repository.setting("update.dismissed", as: String.self)
        return AppUpdate(release: release, banner: UpdatePolicy.banner(release, installed: installed, system: system, now: now, firstSession: firstSession, dismissed: dismissed))
    }

    func dismiss(_ version: String) async throws { try await repository.setSetting("update.dismissed", value: version) }

    private func isFirstSession(now: Date) async throws -> Bool {
        if let firstSession { return firstSession }
        let first = try await repository.setting("update.installedAt", as: Date.self) == nil
        if first { try await repository.setSetting("update.installedAt", value: now) }
        firstSession = first
        return first
    }

    private func release(now: Date) async throws -> StoreRelease? {
        #if NATIVE_DEVELOPMENT
        let arguments = ProcessInfo.processInfo.arguments
        if let index = arguments.firstIndex(of: "--fake-update"), index + 1 < arguments.count {
            let notes = arguments.firstIndex(of: "--fake-update-notes").flatMap { $0 + 1 < arguments.count ? arguments[$0 + 1] : nil }
            return StoreRelease(version: arguments[index + 1], releasedAt: now.addingTimeInterval(-UpdatePolicy.grace), minimumOS: "16.4", notes: notes)
        }
        #endif
        guard Bundle.main.bundleIdentifier == "cc.subeye.app", Bundle.main.appStoreReceiptURL?.lastPathComponent != "sandboxReceipt" else { return nil }
        let cached = try await repository.setting("update.check", as: UpdateCheck.self)
        guard UpdatePolicy.isDue(cached, now: now) else { return cached?.release }
        let check: UpdateCheck
        do { check = UpdateCheck(checkedAt: now, release: try await lookup()) }
        catch {
            try Task.checkCancellation()
            check = UpdateCheck(checkedAt: now, release: cached?.release)
        }
        try await repository.setSetting("update.check", value: check)
        return check.release
    }

    private func lookup() async throws -> StoreRelease? {
        var components = URLComponents(string: "https://itunes.apple.com/lookup")!
        components.queryItems = [URLQueryItem(name: "id", value: String(Self.appID))]
        if let country = await country() { components.queryItems?.append(URLQueryItem(name: "country", value: country)) }
        var request = URLRequest(url: components.url!)
        request.timeoutInterval = 8
        // Apple answers with max-age=86400, so the URL cache would hand a daily check yesterday's answer.
        request.cachePolicy = .reloadIgnoringLocalCacheData
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        return StoreRelease(lookup: data)
    }

    private func country() async -> String? {
        // Storefront is ISO alpha-3 ("UKR"); ICU folds a three-letter region inside a locale identifier to alpha-2.
        if let code = await Storefront.current?.countryCode, let region = Locale(identifier: "und_" + code).region?.identifier, region.count == 2 {
            return region
        }
        return Locale.current.region?.identifier
    }
}
