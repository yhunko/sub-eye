import Foundation
import SubEyeCore

extension Day {
    static func today() -> Date { today(Date(), zone: .current) }
}

func L(_ key: String, _ arguments: [String: String] = [:]) -> String {
    arguments.reduce(NSLocalizedString(key, comment: "")) { result, item in
        result.replacingOccurrences(of: "{" + item.key + "}", with: item.value)
    }
}

enum Display {
    static func amount(_ text: String) throws -> String {
        guard let value = Money.parse(text) else { throw DomainError.invalidField(L("form_price")) }
        return Money.canonical(value)
    }
    static func date(_ value: Date, long: Bool = false) -> String {
        value.formatted(Date.FormatStyle(date: long ? .long : .abbreviated, time: .omitted, timeZone: .gmt))
    }
    private static let currencySymbols = ["afn": "؋", "amd": "֏", "aoa": "Kz", "ars": "$", "aud": "$", "azn": "₼", "bam": "KM", "bbd": "$", "bdt": "৳", "bmd": "$", "bnd": "$", "bob": "Bs", "brl": "R$", "bsd": "$", "bwp": "P", "bzd": "$", "cad": "$", "clp": "$", "cny": "¥", "cop": "$", "crc": "₡", "cup": "$", "czk": "Kč", "dkk": "kr", "dop": "$", "egp": "E£", "eur": "€", "fjd": "$", "fkp": "£", "gbp": "£", "gel": "₾", "ghs": "GH₵", "gip": "£", "gnf": "FG", "gtq": "Q", "gyd": "$", "hkd": "$", "hnl": "L", "huf": "Ft", "idr": "Rp", "ils": "₪", "inr": "₹", "isk": "kr", "jmd": "$", "jpy": "¥", "kgs": "⃀", "khr": "៛", "kmf": "CF", "kpw": "₩", "krw": "₩", "kyd": "$", "kzt": "₸", "lak": "₭", "lbp": "L£", "lkr": "Rs", "lrd": "$", "mga": "Ar", "mmk": "K", "mnt": "₮", "mur": "Rs", "mxn": "$", "myr": "RM", "nad": "$", "ngn": "₦", "nio": "C$", "nok": "kr", "npr": "Rs", "nzd": "$", "php": "₱", "pkr": "Rs", "pln": "zł", "pyg": "₲", "ron": "lei", "rwf": "RF", "sbd": "$", "sek": "kr", "sgd": "$", "shp": "£", "srd": "$", "ssp": "£", "stn": "Db", "syp": "£", "thb": "฿", "top": "T$", "try": "₺", "ttd": "$", "twd": "$", "uah": "₴", "usd": "$", "uyu": "$", "vnd": "₫", "xaf": "FCFA", "xcd": "$", "xcg": "Cg.", "xof": "F CFA", "xpf": "CFPF", "zar": "R", "zmw": "ZK"]
    static func money(_ value: Double, _ currency: String, decimals: Int = 2) -> String {
        let number = value.formatted(.number.locale(Locale(identifier: "en_US")).precision(.fractionLength(decimals)))
        return currencySymbols[currency.lowercased()].map { $0 + number } ?? (number + " " + currency.uppercased())
    }
    static func currencySymbol(_ code: String) -> String? { currencySymbols[code.lowercased()] }
    static func currencyFlag(_ code: String) -> String {
        let code = code.lowercased()
        if let flag = ["xaf": "🌍", "xof": "🌍", "xcd": "🌎", "xcg": "🇨🇼", "xpf": "🇵🇫"][code] { return flag }
        guard code.count == 3, code.unicodeScalars.allSatisfy({ (97...122).contains($0.value) }) else { return "" }
        return code.uppercased().prefix(2).unicodeScalars.compactMap { UnicodeScalar(127397 + $0.value) }.map(String.init).joined()
    }
    static func cadence(_ subscription: Subscription) -> String {
        if subscription.every == 1 { return L("cadence_" + subscription.period.rawValue) }
        let plural: [BillingPeriod: String] = [.day: "Days", .week: "Weeks", .month: "Months", .year: "Years"]
        return L("cadence_every" + plural[subscription.period]!, ["every": String(subscription.every)])
    }
    static func when(_ date: Date, today: Date = Day.today(), countdown: Bool = false) -> String {
        let days = Day.utc.dateComponents([.day], from: today, to: date).day ?? 0
        if days <= 0 { return L("when_today") }
        if days == 1 { return L("when_tomorrow") }
        if days < 14 || countdown { return L("when_inDays", ["days": String(days)]) }
        let format = Date.FormatStyle(timeZone: .gmt).day().month(.abbreviated)
        return date.formatted(Day.utc.component(.year, from: date) == Day.utc.component(.year, from: today) ? format : format.year())
    }
    static func event(_ kind: EventKind) -> String {
        let keys: [EventKind: String] = [.payment: "calendar_kindPayment", .trialEnds: "calendar_kindTrialEnds", .introEnds: "calendar_kindIntroEnds", .priceChange: "calendar_kindPriceChange", .resumes: "calendar_kindResumes", .ends: "calendar_kindEnds"]
        return L(keys[kind]!)
    }
    static func period(_ value: BillingPeriod) -> String { L("period_" + value.rawValue) }
    static func error(_ error: Error) -> String {
        if let error = error as? DomainError {
            switch error {
            case .conflict: return L("native_conflict")
            case .invalidField(let field): return L("native_errorBody") + " (" + field + ")"
            default: break
            }
        }
        return L("native_errorBody")
    }
}
