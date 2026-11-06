import Foundation

// Coordinates are normalized to the image, origin at the top left.
public struct ScreenshotLine: Codable, Equatable, Sendable {
    public var text: String
    public var x: Double
    public var y: Double
    public var width: Double
    public var height: Double
    public init(text: String, x: Double, y: Double, width: Double, height: Double) {
        self.text = text; self.x = x; self.y = y; self.width = width; self.height = height
    }
}

public struct ScreenshotRow: Equatable, Sendable {
    public var name: String
    public var price: String?
    public var renewal: String?
    public init(name: String, price: String?, renewal: String?) { self.name = name; self.price = price; self.renewal = renewal }
}

public struct ImportDraft: Equatable, Sendable {
    public var name: String
    public var cost: Decimal?
    public var currency: String?
    public var every: Int
    public var period: BillingPeriod?
    public var renewal: Date?
    public var status: ScreenshotImport.Status
    public init(name: String, cost: Decimal? = nil, currency: String? = nil, every: Int = 1, period: BillingPeriod? = nil,
                renewal: Date? = nil, status: ScreenshotImport.Status = .renews) {
        self.name = name; self.cost = cost; self.currency = currency; self.every = every; self.period = period
        self.renewal = renewal; self.status = status
    }
}

public enum ScreenshotImport {
    public enum Status: Equatable, Sendable { case renews, ends, ended }

    public static func drafts(_ lines: [ScreenshotLine], now: Date, zone: TimeZone, currencies: Set<String>, region: String?) -> [ImportDraft] {
        let rows = visualRows(lines)
        guard !rows.isEmpty else { return [] }
        let heights = lines.map(\.height).sorted()
        let gap = heights[heights.count / 2] * 0.75
        var blocks: [[VisualRow]] = []
        for row in rows {
            if let last = blocks.last?.last, row.top - last.bottom < gap { blocks[blocks.count - 1].append(row) } else { blocks.append([row]) }
        }
        var drafts: [ImportDraft] = []
        for block in blocks {
            var pending: [VisualRow] = []
            for row in block {
                pending.append(row)
                // The verb can sit on the line above the date, as in "Термін дії спливає:" over "22 червня 2027 р.".
                let verbs = pending.flatMap(\.parts).map(\.text).joined(separator: " ")
                guard let (column, status) = row.parts.lazy.compactMap({ part in
                    renewal(part.text, verbs: verbs, now: now, zone: zone).map { (part.x, $0) }
                }).first else { continue }
                if let draft = draft(pending, column: column, status: status, currencies: currencies, region: region) { drafts.append(draft) }
                pending = []
            }
        }
        return drafts
    }

    public static func structured(_ rows: [ScreenshotRow], lines: [ScreenshotLine], now: Date, zone: TimeZone,
                                  currencies: Set<String>, region: String?) -> [ImportDraft] {
        let text = squeezed(lines.map(\.text).joined(separator: " "))
        func seen(_ value: String?) -> String? {
            guard let value, !squeezed(value).isEmpty, text.contains(squeezed(value)) else { return nil }
            return value
        }
        return rows.compactMap { row in
            let name = row.name.trimmingCharacters(in: .whitespacesAndNewlines)
            guard seen(name) != nil, let status = seen(row.renewal).flatMap({ renewal($0, now: now, zone: zone) }) else { return nil }
            let price = seen(row.price)
            let amount = price.flatMap { self.price($0, currencies: currencies, region: region) }
            let cycle = [price, row.renewal].compactMap { $0 }.lazy.compactMap(cadence).first
            return ImportDraft(name: name, cost: amount?.amount, currency: amount?.currency, every: cycle?.every ?? 1,
                               period: cycle?.period, renewal: status.date, status: status.status)
        }
    }

    public static func merge(_ batches: [[ImportDraft]]) -> [ImportDraft] {
        var seen = Set<String>()
        return batches.joined().filter { seen.insert($0.name.lowercased() + "|" + ($0.renewal.map(Day.key) ?? "")).inserted }
    }

    // A price needs a currency marker, so a day of the month or a year never reads as one.
    public static func price(_ text: String, currencies: Set<String>, region: String?) -> (amount: Decimal, currency: String?)? {
        match(text, currencies: currencies).map { ($0.amount, resolve($0.codes, region: region)) }
    }

    public static func cadence(_ text: String) -> (every: Int, period: BillingPeriod)? {
        let lower = text.lowercased()
        let unit = #"(day|week|wk|month|mo|year|yr|дн|день|тиж|міс|рік|рок|річ)"#
        let patterns: [(String, counted: Bool)] = [
            (#"(\d+)[\s-]*"# + unit, true),
            (#"(?:/|\bper\s|\bна\s|\bщо)\s*"# + unit, false),
            (#"\b(daily|weekly|monthly|yearly|annual|annually)\b"#, false),
            (#"(щоденн|тижнев|місячн|річн)"#, false)
        ]
        for (pattern, counted) in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern),
                  let match = regex.firstMatch(in: lower, range: NSRange(lower.startIndex..., in: lower)) else { continue }
            let group = { (index: Int) in Range(match.range(at: index), in: lower).map { String(lower[$0]) } }
            guard let word = group(counted ? 2 : 1), let period = period(word) else { continue }
            let every = counted ? group(1).flatMap { Int($0) } ?? 1 : 1
            guard (1...60).contains(every) else { continue }
            return (every, period)
        }
        return nil
    }

    public static func renewal(_ text: String, now: Date, zone: TimeZone) -> (date: Date, status: Status)? {
        renewal(text, verbs: text, now: now, zone: zone)
    }

    private static func renewal(_ text: String, verbs: String, now: Date, zone: TimeZone) -> (date: Date, status: Status)? {
        guard let (month, day, year) = date(words(text)) else { return nil }
        let words = words(verbs)
        let status: Status = words.contains(where: { word in ended.contains { word.hasPrefix($0) } }) ? .ended
            : words.contains(where: { word in ends.contains { word.hasPrefix($0) } }) ? .ends : .renews
        let today = Day.today(now, zone: zone)
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = .gmt
        let current = calendar.component(.year, from: today)
        for candidate in year.map({ [$0] }) ?? [current, current + 1] {
            guard let date = calendar.date(from: DateComponents(year: candidate, month: month, day: day)),
                  calendar.component(.day, from: date) == day else { return nil }
            if year != nil || status == .ended || date >= today { return (date, status) }
        }
        return nil
    }

    private static let ends = ["expires", "ends", "закінчу", "завершу", "спливає"]
    private static let ended = ["expired", "ended", "закінчил", "завершил", "сплил", "минул"]
    private static let months: [String: Int] = {
        let sets: [[String]] = [
            ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
            ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"],
            ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"],
            ["січень", "лютий", "березень", "квітень", "травень", "червень", "липень", "серпень", "вересень", "жовтень", "листопад", "грудень"],
            ["січ", "лют", "бер", "квіт", "трав", "черв", "лип", "серп", "вер", "жовт", "лист", "груд"]
        ]
        var table = ["sept": 9]
        for set in sets { for (index, name) in set.enumerated() { table[name] = index + 1 } }
        return table
    }()

    private static func date(_ words: [String]) -> (month: Int, day: Int, year: Int?)? {
        func number(_ index: Int, in range: ClosedRange<Int>) -> Int? {
            guard words.indices.contains(index), let value = Int(words[index]), range.contains(value) else { return nil }
            return value
        }
        for (index, word) in words.enumerated() {
            guard let month = months[word] else { continue }
            if let day = number(index - 1, in: 1...31) { return (month, day, number(index + 1, in: 2000...2100)) }
            if let day = number(index + 1, in: 1...31) { return (month, day, number(index + 2, in: 2000...2100)) }
        }
        return nil
    }

    private static func period(_ word: String) -> BillingPeriod? {
        if word.hasPrefix("d") || word.hasPrefix("дн") || word.hasPrefix("ден") || word.hasPrefix("щоден") { return .day }
        if word.hasPrefix("w") || word.hasPrefix("тиж") { return .week }
        if word.hasPrefix("mo") || word.hasPrefix("міс") { return .month }
        if word.hasPrefix("y") || word.hasPrefix("an") || word.hasPrefix("рік") || word.hasPrefix("рок") || word.hasPrefix("річ") { return .year }
        return nil
    }

    // Separators are read from the digits, not the locale: the screen's locale is whatever the phone was set to.
    private static func amount(_ raw: String) -> Decimal? {
        var digits = raw.filter { !$0.isWhitespace }
        let separators = digits.filter { $0 == "." || $0 == "," }
        if let grouping = separators.first,
           separators.count > 1 || digits.split(separator: grouping, omittingEmptySubsequences: false).last?.count == 3 {
            digits = digits.filter { $0 != grouping }
        }
        return Money.parse(digits)
    }

    private static func markers(_ currencies: Set<String>) -> [String: [String]] {
        var table: [String: [String]] = currencies.contains("uah") ? ["грн": ["uah"]] : [:]
        for (code, symbol) in Money.symbols where currencies.contains(code) {
            table[symbol, default: []].append(code)
        }
        for code in currencies { table[code.uppercased(), default: []].append(code) }
        return table
    }

    private static func match(_ text: String, currencies: Set<String>) -> (amount: Decimal, codes: [String], range: Range<String.Index>)? {
        let number = #"(?<![\d.,])(\d{1,3}(?:[\s\u00a0\u202f.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![\d])"#
        let symbols = markers(currencies)
        let marker = #"(?<!\p{L})("# + symbols.keys.sorted { $0.count > $1.count }.map(NSRegularExpression.escapedPattern).joined(separator: "|") + #")(?!\p{L})"#
        for (pattern, numberGroup, markerGroup) in [(marker + #"\s?"# + number, 2, 1), (number + #"\s?"# + marker, 1, 2)] {
            guard let regex = try? NSRegularExpression(pattern: pattern) else { continue }
            for found in regex.matches(in: text, range: NSRange(text.startIndex..., in: text)) {
                guard let digits = Range(found.range(at: numberGroup), in: text), let symbol = Range(found.range(at: markerGroup), in: text),
                      let whole = Range(found.range, in: text), let amount = amount(String(text[digits])) else { continue }
                return (amount, symbols[String(text[symbol])] ?? [], whole)
            }
        }
        return nil
    }

    private static func resolve(_ codes: [String], region: String?) -> String? {
        if codes.count == 1 { return codes[0] }
        if let region = region?.lowercased(), codes.contains(region) { return region }
        return ["usd", "gbp", "jpy"].first(where: codes.contains)
    }

    private static func squeezed(_ text: String) -> String { text.lowercased().filter { !$0.isWhitespace } }

    private struct VisualRow {
        var parts: [(text: String, x: Double)]
        var top: Double
        var bottom: Double
    }

    private static func visualRows(_ lines: [ScreenshotLine]) -> [VisualRow] {
        var rows: [(lines: [ScreenshotLine], top: Double, bottom: Double)] = []
        for line in lines.filter({ !$0.text.trimmingCharacters(in: .whitespaces).isEmpty }).sorted(by: { $0.y + $0.height / 2 < $1.y + $1.height / 2 }) {
            let top = line.y, bottom = line.y + line.height
            if let last = rows.last, min(bottom, last.bottom) - max(top, last.top) >= min(line.height, last.bottom - last.top) / 2 {
                rows[rows.count - 1] = (last.lines + [line], min(top, last.top), max(bottom, last.bottom))
            } else { rows.append(([line], top, bottom)) }
        }
        return rows.map { VisualRow(parts: $0.lines.sorted { $0.x < $1.x }.map { ($0.text, $0.x) }, top: $0.top, bottom: $0.bottom) }
    }

    // Text left of the date's column is read off the app icon (Apple TV+'s "tv+", Lightroom's "Lr"), never the name.
    private static func draft(_ rows: [VisualRow], column: Double, status: (date: Date, status: Status), currencies: Set<String>,
                              region: String?) -> ImportDraft? {
        let parts = rows.flatMap(\.parts).filter { $0.x >= column - 0.03 }.map(\.text)
        let name = parts.lazy.compactMap { part -> String? in
            guard date(words(part)) == nil else { return nil }
            let lead = match(part, currencies: currencies).map { String(part[..<$0.range.lowerBound]) } ?? part
            let trimmed = lead.trimmingCharacters(in: .whitespacesAndNewlines.union(.punctuationCharacters))
            return trimmed.isEmpty ? nil : trimmed
        }.first
        guard let name else { return nil }
        let priced = parts.first { match($0, currencies: currencies) != nil }
        let amount = priced.flatMap { price($0, currencies: currencies, region: region) }
        let cycle = ([priced].compactMap { $0 } + parts).lazy.compactMap(cadence).first
        return ImportDraft(name: name, cost: amount?.amount, currency: amount?.currency, every: cycle?.every ?? 1,
                           period: cycle?.period, renewal: status.date, status: status.status)
    }

    private static func words(_ text: String) -> [String] {
        text.lowercased().split { !$0.isLetter && !$0.isNumber }.map(String.init)
    }
}
