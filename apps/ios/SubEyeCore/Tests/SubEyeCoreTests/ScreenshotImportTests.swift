import XCTest
@testable import SubEyeCore

final class ScreenshotImportTests: XCTestCase {
    let now = Day.parse("2026-11-05T12:00:00Z")!
    let kyiv = TimeZone(identifier: "Europe/Kyiv")!
    let catalogue: Set<String> = ["usd", "eur", "gbp", "uah", "cad", "aud", "jpy", "pln", "sek", "nok", "dkk", "chf", "zar", "bwp"]

    private func price(_ text: String, region: String? = nil) -> (Decimal, String?)? {
        ScreenshotImport.price(text, currencies: catalogue, region: region).map { ($0.amount, $0.currency) }
    }
    private func assertPrice(_ text: String, _ amount: Decimal, _ currency: String?, region: String? = nil, line: UInt = #line) {
        let parsed = price(text, region: region)
        XCTAssertEqual(parsed.map { Money.canonical($0.0) }, Money.canonical(amount), text, line: line)
        XCTAssertEqual(parsed?.1, currency, text, line: line)
    }
    private func day(_ key: String) -> Date { Day.parse(key)! }

    func testDotAndCommaDecimals() {
        assertPrice("$9.99", 9.99, "usd")
        assertPrice("9,99 €", 9.99, "eur")
    }

    func testBothSeparatorsMakeTheLastOneDecimal() {
        assertPrice("$1,299.00", 1299, "usd")
        assertPrice("1.299,00 €", 1299, "eur")
    }

    func testALoneSeparatorBeforeThreeDigitsIsGrouping() {
        assertPrice("¥1,200", 1200, "jpy")
        assertPrice("¥1.200", 1200, "jpy")
    }

    func testSpacesInsideTheNumberAreGrouping() {
        assertPrice("1\u{202f}299,00\u{a0}₴", 1299, "uah")
        assertPrice("1 299,00 ₴", 1299, "uah")
    }

    func testHryvniaSymbolBeforeAndAfter() {
        assertPrice("149,00 ₴", 149, "uah")
        assertPrice("₴149", 149, "uah")
    }

    func testHryvniaAbbreviation() {
        assertPrice("149 грн", 149, "uah")
        assertPrice("149,99 грн.", 149.99, "uah")
    }

    func testCodesBeforeAndAfterTheNumber() {
        assertPrice("USD 4.99", 4.99, "usd")
        assertPrice("149 UAH", 149, "uah")
        assertPrice("4,99 USD/міс.", 4.99, "usd")
    }

    func testAmbiguousSymbolFollowsTheRegionThenThePrimary() {
        assertPrice("$12.99", 12.99, "cad", region: "cad")
        assertPrice("$12.99", 12.99, "usd", region: "uah")
        assertPrice("£4.99", 4.99, "gbp", region: "usd")
        assertPrice("kr 59", 59, nil, region: "usd")
        assertPrice("kr 59", 59, "nok", region: "nok")
    }

    func testALetterSymbolCountsOnlyOutsideAWord() {
        assertPrice("R149,99", 149.99, "zar")
        XCTAssertNil(price("Season 2 Pass"), "P is the pula only where no letter follows")
    }

    func testACountryMarkNamesTheCurrencyWhateverTheRegion() {
        let wide = catalogue.union(["nzd", "hkd", "mxn", "twd", "cny"])
        let cases: [(String, Decimal, String)] = [
            ("CA$12.99", 12.99, "cad"), ("A$14.99", 14.99, "aud"), ("AU$14.99", 14.99, "aud"), ("US$4.99", 4.99, "usd"),
            ("NZ$9.99", 9.99, "nzd"), ("HK$48.00", 48, "hkd"), ("MX$99.00", 99, "mxn"), ("NT$150", 150, "twd"), ("CN¥30.00", 30, "cny"),
            ("JP¥1,200", 1200, "jpy"), ("12,99 $CA", 12.99, "cad"), ("4,99 $US", 4.99, "usd"), ("Renews 3 January · CA$12.99/month", 12.99, "cad")
        ]
        for (text, amount, currency) in cases {
            let parsed = ScreenshotImport.price(text, currencies: wide, region: "usd")
            XCTAssertEqual(parsed.map { Money.canonical($0.amount) }, Money.canonical(amount), text)
            XCTAssertEqual(parsed?.currency, currency, text)
        }
    }

    func testACountryMarkOutsideTheCatalogueIsNoPrice() {
        XCTAssertNil(price("HK$48.00"), "Without HKD the letters before $ make it no bare dollar either")
    }

    func testWordsWithoutAnAmountAreNotPrices() {
        XCTAssertNil(price("Free Trial"))
        XCTAssertNil(price("Free"))
        XCTAssertNil(price("$"))
    }

    func testOnlyCataloguedCodesAreCurrencies() {
        XCTAssertNil(price("RUB 100"))
        XCTAssertNil(price("100 BYN"))
    }

    func testNumbersWithoutAMarkerAreNotPrices() {
        XCTAssertNil(price("Renews 12 December 2026"))
        XCTAssertNil(price("Family Sharing 6"))
    }

    func testAYearBeforeAPriceStaysOutOfIt() {
        assertPrice("Renews 12 December 2026 149,00 ₴", 149, "uah")
        assertPrice("12 грудня 2026 р. · 4,99 $", 4.99, "usd")
    }

    func testEnglishPeriodPhrases() {
        let cases: [(String, Int, BillingPeriod)] = [
            ("$9.99/month", 1, .month), ("$9.99/mo", 1, .month), ("$9.99 per month", 1, .month), ("Monthly", 1, .month),
            ("Individual (Monthly)", 1, .month), ("$99.99/year", 1, .year), ("$99.99/yr", 1, .year), ("Yearly", 1, .year),
            ("Annual", 1, .year), ("$2.99/week", 1, .week), ("Weekly", 1, .week), ("every 3 months", 3, .month),
            ("$29.99 / 6 months", 6, .month), ("2 weeks", 2, .week), ("1 year", 1, .year)
        ]
        for (text, every, period) in cases {
            let parsed = ScreenshotImport.cadence(text)
            XCTAssertEqual(parsed?.every, every, text); XCTAssertEqual(parsed?.period, period, text)
        }
    }

    func testUkrainianPeriodPhrases() {
        let cases: [(String, Int, BillingPeriod)] = [
            ("149,00 ₴/міс.", 1, .month), ("на місяць", 1, .month), ("щомісяця", 1, .month), ("Щомісячна", 1, .month),
            ("4,99 $/рік", 1, .year), ("на рік", 1, .year), ("щороку", 1, .year), ("щорічно", 1, .year), ("Річна", 1, .year),
            ("щотижня", 1, .week), ("/тиж.", 1, .week), ("кожні 3 місяці", 3, .month), ("6 місяців", 6, .month),
            ("2 тижні", 2, .week), ("1 рік", 1, .year)
        ]
        for (text, every, period) in cases {
            let parsed = ScreenshotImport.cadence(text)
            XCTAssertEqual(parsed?.every, every, text); XCTAssertEqual(parsed?.period, period, text)
        }
    }

    func testNoPeriodPhraseMeansNoCadence() {
        XCTAssertNil(ScreenshotImport.cadence("YouTube Premium"))
        XCTAssertNil(ScreenshotImport.cadence("Renews 12 December"))
    }

    func testEnglishDatesInBothOrders() {
        XCTAssertEqual(ScreenshotImport.renewal("Renews 12 December", now: now, zone: kyiv)?.date, day("2026-12-12"))
        XCTAssertEqual(ScreenshotImport.renewal("Renews December 12", now: now, zone: kyiv)?.date, day("2026-12-12"))
        XCTAssertEqual(ScreenshotImport.renewal("Renews Dec 12, 2027", now: now, zone: kyiv)?.date, day("2027-12-12"))
        XCTAssertEqual(ScreenshotImport.renewal("Renews 3 Sept", now: now, zone: kyiv)?.date, day("2027-09-03"))
    }

    func testUkrainianDates() {
        XCTAssertEqual(ScreenshotImport.renewal("Поновлюється 12 грудня", now: now, zone: kyiv)?.date, day("2026-12-12"))
        XCTAssertEqual(ScreenshotImport.renewal("12 груд. 2027 р.", now: now, zone: kyiv)?.date, day("2027-12-12"))
        XCTAssertEqual(ScreenshotImport.renewal("3 січня", now: now, zone: kyiv)?.date, day("2027-01-03"))
    }

    func testAYearlessDateIsTheNextOneOnOrAfterTodayInTheUsersZone() {
        XCTAssertEqual(ScreenshotImport.renewal("Renews 5 November", now: now, zone: kyiv)?.date, day("2026-11-05"))
        XCTAssertEqual(ScreenshotImport.renewal("Renews 4 November", now: now, zone: kyiv)?.date, day("2027-11-04"))
        let lateEvening = Day.parse("2026-11-04T22:30:00Z")!
        XCTAssertEqual(ScreenshotImport.renewal("Renews 4 November", now: lateEvening, zone: kyiv)?.date, day("2027-11-04"),
                       "00:30 on 5 November in Kyiv: the 4th has already passed there")
        XCTAssertEqual(ScreenshotImport.renewal("Renews 4 November", now: lateEvening, zone: .gmt)?.date, day("2026-11-04"))
    }

    func testAnImpossibleDayIsNoDate() {
        XCTAssertNil(ScreenshotImport.renewal("Renews 31 November", now: now, zone: kyiv))
    }

    func testALeapDayNeedsALeapYear() {
        XCTAssertEqual(ScreenshotImport.renewal("Renews 29 February 2028", now: now, zone: kyiv)?.date, day("2028-02-29"))
        XCTAssertNil(ScreenshotImport.renewal("Renews 29 February 2027", now: now, zone: kyiv))
    }

    func testCadenceWithAHyphenAndOutOfRangeCounts() {
        XCTAssertEqual(ScreenshotImport.cadence("3-month plan")?.every, 3)
        XCTAssertEqual(ScreenshotImport.cadence("3-month plan")?.period, .month)
        XCTAssertNil(ScreenshotImport.cadence("0 months"))
        XCTAssertNil(ScreenshotImport.cadence("90 days"), "A count past 60 is a trial length, not a billing cycle")
    }

    func testStatusVerbs() {
        XCTAssertEqual(ScreenshotImport.renewal("Renews 12 December", now: now, zone: kyiv)?.status, .renews)
        XCTAssertEqual(ScreenshotImport.renewal("Expires 12 December", now: now, zone: kyiv)?.status, .ends)
        XCTAssertEqual(ScreenshotImport.renewal("Expired 3 March", now: now, zone: kyiv)?.status, .ended)
        XCTAssertEqual(ScreenshotImport.renewal("Expired 3 March", now: now, zone: kyiv)?.date, day("2026-03-03"),
                       "A past status keeps this year rather than rolling forward")
    }

    func testMergeDropsTheOverlapOfTwoScreenshots() {
        let first = [ImportDraft(name: "iCloud+", renewal: day("2026-12-01")), ImportDraft(name: "Duolingo", renewal: day("2026-11-20"))]
        let second = [ImportDraft(name: "duolingo", renewal: day("2026-11-20")), ImportDraft(name: "Netflix", renewal: day("2026-11-30"))]
        XCTAssertEqual(ScreenshotImport.merge([first, second]).map(\.name), ["iCloud+", "Duolingo", "Netflix"])
    }

    func testMergeKeepsTheSameNameOnDifferentDates() {
        let first = [ImportDraft(name: "Apple One", renewal: day("2026-12-01"))]
        let second = [ImportDraft(name: "Apple One", renewal: day("2027-01-15")), ImportDraft(name: "Apple One", renewal: day("2026-12-01"))]
        XCTAssertEqual(ScreenshotImport.merge([first, second]).map(\.renewal), [day("2026-12-01"), day("2027-01-15")])
    }

    func testNoTextReadsAsNoDrafts() {
        XCTAssertEqual(ScreenshotImport.drafts([], now: now, zone: kyiv, currencies: catalogue, region: nil), [])
        XCTAssertEqual(ScreenshotImport.drafts([line("  ", y: 0.3), line("", y: 0.4)], now: now, zone: kyiv, currencies: catalogue, region: nil), [])
    }

    func testRowsWithoutADateAreNotSubscriptions() {
        let lines = [line("Subscriptions", y: 0.10, height: 0.03), line("See All", y: 0.2), line("Apple One", y: 0.3), line("$19.95/month", y: 0.325)]
        XCTAssertEqual(ScreenshotImport.drafts(lines, now: now, zone: kyiv, currencies: catalogue, region: "usd"), [])
    }

    func testACanadianListReadInEnglishKeepsItsDollars() {
        let lines = [line("Crave", y: 0.30), line("CA$9.99/month", y: 0.325), line("Renews 3 January", y: 0.35)]
        XCTAssertEqual(ScreenshotImport.drafts(lines, now: now, zone: kyiv, currencies: catalogue, region: "usd"),
                       [ImportDraft(name: "Crave", cost: Decimal(string: "9.99"), currency: "cad", period: .month, renewal: day("2027-01-03"))])
    }

    func testStructuredRowsNeedADate() {
        let lines = [line("iCloud+", y: 0.30), line("$2.99/month", y: 0.33)]
        let rows = [ScreenshotRow(name: "iCloud+", price: "$2.99/month", renewal: nil)]
        XCTAssertEqual(ScreenshotImport.structured(rows, lines: lines, now: now, zone: kyiv, currencies: catalogue, region: nil), [])
    }

    func testStructuredRowsGoThroughTheSameRulesAndMustAppearInTheText() {
        let lines = [line("iCloud+", y: 0.30), line("Renews 1 December", y: 0.33), line("$2.99/month", y: 0.36)]
        let rows = [
            ScreenshotRow(name: "iCloud+", price: "$2.99/month", renewal: "Renews 1 December"),
            ScreenshotRow(name: "Netflix", price: "$15.49/month", renewal: "Renews 1 December"),
            ScreenshotRow(name: "iCloud+", price: "$3.99/month", renewal: "Renews 1 December")
        ]
        let drafts = ScreenshotImport.structured(rows, lines: lines, now: now, zone: kyiv, currencies: catalogue, region: "uah")
        XCTAssertEqual(drafts, [
            ImportDraft(name: "iCloud+", cost: Decimal(string: "2.99"), currency: "usd", period: .month, renewal: day("2026-12-01")),
            ImportDraft(name: "iCloud+", period: nil, renewal: day("2026-12-01"))
        ], "An invented name is dropped; an invented price is not read")
    }

    func testRuleParserGroupsRowsAndSkipsChrome() {
        let lines = [
            line("9:41", y: 0.01, x: 0.1), line("Subscriptions", y: 0.10, height: 0.03),
            line("ACTIVE", y: 0.18, height: 0.015),
            line("Apple One", y: 0.22), line("Individual (Monthly)", y: 0.245), line("Renews 12 December", y: 0.27),
            line("YouTube Premium", y: 0.33), line("£12.99", y: 0.33, x: 0.75), line("Renews 3 January", y: 0.355),
            line("Disney+", y: 0.42), line("Expires 20 November", y: 0.445),
            line("INACTIVE", y: 0.52, height: 0.015),
            line("Paramount+", y: 0.56), line("Expired 3 March", y: 0.585)
        ]
        let drafts = ScreenshotImport.drafts(lines, now: now, zone: kyiv, currencies: catalogue, region: "gbp")
        XCTAssertEqual(drafts, [
            ImportDraft(name: "Apple One", period: .month, renewal: day("2026-12-12")),
            ImportDraft(name: "YouTube Premium", cost: Decimal(string: "12.99"), currency: "gbp", renewal: day("2027-01-03")),
            ImportDraft(name: "Disney+", renewal: day("2026-11-20"), status: .ends),
            ImportDraft(name: "Paramount+", renewal: day("2026-03-03"), status: .ended)
        ])
    }

    func testStatusVerbOnTheLineAboveTheDate() {
        let lines = [line("Кошторис", y: 0.30), line("Річна", y: 0.325), line("Термін дії спливає:", y: 0.35), line("22 червня 2027 р.", y: 0.375)]
        XCTAssertEqual(ScreenshotImport.drafts(lines, now: now, zone: kyiv, currencies: catalogue, region: nil),
                       [ImportDraft(name: "Кошторис", period: .year, renewal: day("2027-06-22"), status: .ends)])
    }

    func testAPriceReadIntoTheNameLineStaysOutOfTheName() {
        let lines = [line("YouTube Premium   $13.99 >", y: 0.30), line("Renews 1 December", y: 0.325)]
        XCTAssertEqual(ScreenshotImport.drafts(lines, now: now, zone: kyiv, currencies: catalogue, region: nil),
                       [ImportDraft(name: "YouTube Premium", cost: Decimal(string: "13.99"), currency: "usd", renewal: day("2026-12-01"))])
    }

    func testIconTextLeftOfTheRowIsNotTheName() {
        let lines = [line("tv+", y: 0.30, x: 0.09), line("Apple TV+", y: 0.30), line("Renews 1 December", y: 0.325)]
        XCTAssertEqual(ScreenshotImport.drafts(lines, now: now, zone: kyiv, currencies: catalogue, region: nil).map(\.name), ["Apple TV+"])
    }

    func testUkrainianScreen() throws {
        let top = try drafts("subscriptions-uk-1"), bottom = try drafts("subscriptions-uk-2")
        XCTAssertEqual(top.filter { $0.status != .ended }, [
            ImportDraft(name: "Tunewave", cost: Decimal(string: "3.49"), currency: "usd", renewal: day("2026-11-09")),
            ImportDraft(name: "Кошторис: облік і бюджет", period: .year, renewal: day("2027-03-14"), status: .ends),
            ImportDraft(name: "inkwell+", cost: Decimal(string: "1.99"), currency: "usd", renewal: day("2026-11-28")),
            ImportDraft(name: "Shieldly Remote", period: .year, renewal: day("2026-12-07"), status: .ends)
        ])
        XCTAssertEqual(top.filter { $0.status == .ended }.map(\.name), ["Pantri Al: Grocery Lists", "Reelbox"])
        XCTAssertEqual(bottom.map(\.name), ["Pantri Al: Grocery Lists", "Reelbox", "Смаколик: рецепти, меню, ПЛ", "Cloudnest"],
                       "The half-hidden row under the bar reads as no date")
        XCTAssertEqual(bottom.map(\.status), [.ended, .ended, .ended, .ended])
        XCTAssertEqual(ScreenshotImport.merge([top, bottom]).map(\.name),
                       ["Tunewave", "Кошторис: облік і бюджет", "inkwell+", "Shieldly Remote", "Pantri Al: Grocery Lists", "Reelbox",
                        "Смаколик: рецепти, меню, ПЛ", "Cloudnest"])
    }

    func testEnglishScreens() throws {
        let first = try drafts("subscriptions-en-1"), second = try drafts("subscriptions-en-2")
        XCTAssertEqual(first.filter { $0.status != .ended }, [
            ImportDraft(name: "Tunewave", cost: Decimal(string: "12.99"), currency: "usd", renewal: day("2027-07-19"))
        ])
        XCTAssertEqual(first.filter { $0.status == .ended }.map(\.name),
                       ["Pose Studio Photo & Body", "Pit TV", "Dialo", "Lumen Edit for iPad", "Stride Fitness", "Reelbox+"],
                       "Icon text left of the rows (\"Le\", \"rb+\") is never a name")
        XCTAssertEqual(second.filter { $0.status != .ended }, [ImportDraft(name: "Streamly", renewal: day("2027-07-24"))],
                       "Vision reads ₦ as N, which is no currency marker, so the price is left for the user")
        XCTAssertEqual(second.filter { $0.status == .ended }.count, 6)
    }

    private func drafts(_ fixture: String) throws -> [ImportDraft] {
        let url = try XCTUnwrap(Bundle.module.url(forResource: fixture, withExtension: "json", subdirectory: "Fixtures"))
        let lines = try JSONDecoder().decode([ScreenshotLine].self, from: Data(contentsOf: url))
        return ScreenshotImport.drafts(lines, now: now, zone: kyiv, currencies: catalogue, region: "uah")
    }

    private func line(_ text: String, y: Double, x: Double = 0.18, height: Double = 0.02) -> ScreenshotLine {
        ScreenshotLine(text: text, x: x, y: y, width: 0.4, height: height)
    }
}
