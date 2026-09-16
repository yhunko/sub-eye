import Foundation
import SubEyeCore

actor ExchangeRateService {
    private let repository: SubscriptionRepository
    private var current: ExchangeRates?
    init(repository: SubscriptionRepository) { self.repository = repository }

    func cached() async throws -> ExchangeRates {
        if let current { return current }
        if let cached = try await repository.setting("fx.cache", as: ExchangeRates.self), cached.base == "usd" {
            current = cached; return cached
        }
        let legacy = try await repository.legacyValues(prefix: "subeye.fx:")
        if let raw = legacy["subeye.fx:subeye.fx.usd"], let migrated = try? JSONCodec.decode(ExchangeRates.self, Data(raw.utf8)), migrated.base == "usd" {
            current = migrated; try await repository.setSetting("fx.cache", value: migrated); return migrated
        }
        guard let url = Bundle.main.url(forResource: "fx-seed", withExtension: "json"),
              let parsed = try parse(Data(contentsOf: url)) else { throw DomainError.invalidDocument("Bundled rates missing") }
        current = parsed; return parsed
    }

    func refresh(now: Date) async throws -> ExchangeRates {
        let existing = try await cached()
        if existing.rateDate == Day.key(now) { return existing }
        if let attempted = try await repository.setting("fx.lastAttempt", as: Date.self), now.timeIntervalSince(attempted) < 3600 { return existing }
        try await repository.setSetting("fx.lastAttempt", value: now)
        for version in [Day.key(now), Day.key(Day.shift(now, days: -1)), "latest"] {
            try Task.checkCancellation()
            guard let url = URL(string: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@\(version)/v1/currencies/usd.json") else { continue }
            do {
                var request = URLRequest(url: url); request.timeoutInterval = 8
                let (data, response) = try await URLSession.shared.data(for: request)
                guard (response as? HTTPURLResponse)?.statusCode == 200, let fresh = try parse(data) else { continue }
                current = fresh; try await repository.setSetting("fx.cache", value: fresh); return fresh
            } catch is CancellationError { throw CancellationError() }
            catch { continue }
        }
        return existing
    }

    private func parse(_ data: Data) throws -> ExchangeRates? {
        guard let raw = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let rates = raw["usd"] as? [String: Double], rates["usd"] == 1,
              rates.values.allSatisfy({ $0.isFinite && $0 > 0 }) else { return nil }
        return ExchangeRates(rates: rates, rateDate: raw["date"] as? String ?? "")
    }
}
