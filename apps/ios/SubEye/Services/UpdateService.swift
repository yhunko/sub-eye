import Foundation
import StoreKit
import SubEyeCore
import UIKit

struct AppUpdate: Equatable {
    var release: StoreRelease
    var banner: Bool
    var alert: Bool
}

@MainActor
final class UpdateService {
    static let appID = 6795566917
    private let repository: SubscriptionRepository
    private var firstSession: Bool?
    init(repository: SubscriptionRepository) { self.repository = repository }

    private var installed: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "" }

    func current(now: Date) async throws -> AppUpdate? {
        let firstSession = try await isFirstSession(now: now)
        #if NATIVE_DEVELOPMENT
        if try await faking() {
            let parts = installed.split(separator: ".").map { Int($0) ?? 0 }
            let version = "\(parts.first ?? 0).\((parts.dropFirst().first ?? 0) + 1).0"
            return try await offer(StoreRelease(version: version, releasedAt: now.addingTimeInterval(-UpdatePolicy.grace), minimumOS: "16.4"), firstSession: false, now: now)
        }
        #endif
        return try await offer(lookupIfDue(now: now), firstSession: firstSession, now: now)
    }

    func dismiss(_ version: String) async throws { try await repository.setSetting("update.dismissed", value: version) }
    func alerted(_ version: String) async throws { try await repository.setSetting("update.alerted", value: version) }

    #if NATIVE_DEVELOPMENT
    func faking() async throws -> Bool { try await repository.setting("developer.fakeUpdate", as: Bool.self) == true }
    func fake(_ enabled: Bool) async throws {
        try await repository.setSetting("developer.fakeUpdate", value: enabled)
        try await repository.setSetting("update.dismissed", value: "")
        try await repository.setSetting("update.alerted", value: "")
    }
    #endif

    private func offer(_ release: StoreRelease?, firstSession: Bool, now: Date) async throws -> AppUpdate? {
        let system = UIDevice.current.systemVersion
        guard let release, UpdatePolicy.available(release, installed: installed, system: system, now: now, firstSession: firstSession) else { return nil }
        let dismissed = try await repository.setting("update.dismissed", as: String.self)
        let alerted = try await repository.setting("update.alerted", as: String.self)
        return AppUpdate(release: release,
                         banner: UpdatePolicy.shows(release, installed: installed, system: system, now: now, firstSession: firstSession, hiddenFor: dismissed),
                         alert: UpdatePolicy.shows(release, installed: installed, system: system, now: now, firstSession: firstSession, hiddenFor: alerted))
    }

    private func isFirstSession(now: Date) async throws -> Bool {
        if let firstSession { return firstSession }
        let first = try await repository.setting("update.installedAt", as: Date.self) == nil
        if first { try await repository.setSetting("update.installedAt", value: now) }
        firstSession = first
        return first
    }

    private func lookupIfDue(now: Date) async throws -> StoreRelease? {
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
