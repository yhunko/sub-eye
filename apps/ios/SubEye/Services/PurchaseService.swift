import Foundation
import RevenueCat
import SubEyeCore

@MainActor
final class PurchaseService {
    private let repository: SubscriptionRepository
    private var configured = false
    init(repository: SubscriptionRepository) { self.repository = repository }

    private func configure() throws {
        if configured { return }
        guard let key = Bundle.main.object(forInfoDictionaryKey: "RevenueCatAPIKey") as? String, key.hasPrefix("appl_") else {
            throw DomainError.invalidField("RevenueCatAPIKey")
        }
        Purchases.logLevel = .error
        Purchases.configure(withAPIKey: key)
        configured = true
    }
    func refresh() async throws -> Bool {
        try configure()
        return try await apply(Purchases.shared.customerInfo())
    }
    func offering() async throws -> Package? {
        try configure()
        let current = try await Purchases.shared.offerings().current
        return current?.lifetime ?? current?.availablePackages.first
    }
    func purchase(_ package: Package) async throws -> Bool? {
        try configure()
        let result = try await Purchases.shared.purchase(package: package)
        if result.userCancelled { return nil }
        return try await apply(result.customerInfo)
    }
    func restore() async throws -> Bool {
        try configure()
        return try await apply(Purchases.shared.restorePurchases())
    }
    private func apply(_ info: CustomerInfo) async throws -> Bool {
        let entitled = info.entitlements.active["pro"] != nil
        try await repository.setSetting("pro.entitled", value: entitled)
        return entitled
    }
}
