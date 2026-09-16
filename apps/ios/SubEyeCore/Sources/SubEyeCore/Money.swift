import Foundation

public struct ExchangeRates: Codable, Equatable, Sendable {
    public var base: String
    public var rates: [String: Double]
    public var rateDate: String

    public init(rates: [String: Double] = ["usd": 1, "uah": 1], rateDate: String = "", base: String = "usd") {
        self.base = base; self.rates = rates; self.rateDate = rateDate
    }

    public func convert(_ amount: Double, from: String, to: String) -> Double {
        let source = from.lowercased(), target = to.lowercased()
        guard source != target, amount != 0,
              let fromRate = rates[source], let toRate = rates[target],
              fromRate.isFinite, toRate.isFinite, fromRate > 0, toRate > 0 else { return amount }
        return amount / fromRate * toRate
    }
}

public enum Money {
    public static func monthly(_ amount: Double, every: Int, period: BillingPeriod) -> Double {
        let interval = Double(max(1, every)), value = max(0, amount)
        switch period {
        case .day: return value * 30.4375 / interval
        case .week: return value * 4.345 / interval
        case .month: return value / interval
        case .year: return value / 12 / interval
        }
    }

    public static func parse(_ text: String) -> Decimal? {
        let cleaned = text.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "\u{00a0}", with: "")
            .replacingOccurrences(of: "\u{202f}", with: "")
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: ",", with: ".")
        guard !cleaned.isEmpty, cleaned.range(of: #"^\d+(\.\d{1,2})?$"#, options: .regularExpression) != nil,
              let value = Decimal(string: cleaned, locale: Locale(identifier: "en_US_POSIX")),
              value >= 0, value < 100_000_000 else { return nil }
        return value
    }

    public static func canonical(_ amount: Decimal) -> String {
        var source = amount, rounded = Decimal()
        NSDecimalRound(&rounded, &source, 2, .plain)
        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.minimumFractionDigits = 2; formatter.maximumFractionDigits = 2
        formatter.usesGroupingSeparator = false
        return formatter.string(from: NSDecimalNumber(decimal: rounded))!
    }
    public static func display(_ amount: Double, currency: String, locale: Locale = .current, decimals: Int = 2) -> String {
        amount.formatted(.currency(code: currency.uppercased()).locale(locale).precision(.fractionLength(decimals)))
    }
}
