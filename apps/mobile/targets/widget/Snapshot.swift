import Foundation

/// Mirrors `WidgetSnapshot` in `src/shared/lib/widget/snapshot.ts`.
///
/// Every string here arrives already formatted and already translated. The
/// extension deliberately owns no currency formatting, no number formatting and
/// no catalog of its own — the app writes what it draws on screen, so the widget
/// cannot disagree with the app about a price, a separator or a locale.
///
/// The one exception is `WidgetItem.date`, which is an instant: see below.
struct Snapshot: Decodable {
  let v: Int
  let locked: Bool
  let lockTitle: String
  let lockCta: String
  let monthLabel: String
  let monthTotal: String
  let upcomingLabel: String
  let emptyLabel: String
  let delta: String?
  let deltaLabel: String
  let deltaUp: Bool
  let alsoDue: String?
  /// The app's own locale tag, used for the one string the extension still
  /// words itself. See `WidgetItem.dueText(locale:)`.
  let locale: String?
  let items: [WidgetItem]
}

struct WidgetItem: Decodable, Identifiable {
  let id: String
  let name: String
  let domain: String?
  let amount: String
  let date: String

  /// The app writes `Date.toISOString()`, which carries MILLISECONDS — exactly
  /// what `ISO8601DateFormatter` drops unless asked for them. Getting this wrong
  /// is silent: `date(from:)` returns nil and every row renders "in 0 seconds".
  var due: Date? {
    Self.isoWithFractionalSeconds.date(from: date) ?? Self.iso.date(from: date)
  }

  /// "today" / "tomorrow" / "in 4 days", localised by the OS.
  ///
  /// Formatted from a whole-DAY difference rather than from the instant itself.
  /// `.relative` on the raw date picks the largest unit that fits, so a payment
  /// due this morning rendered as "20 minutes ago" — technically true, useless
  /// on a widget, and it would have flipped wording several times a day.
  ///
  /// Both sides are day LABELS, and the rule for which calendar names each one
  /// lives in `src/shared/lib/format/day.ts`: a stored date is decoded in UTC,
  /// because that is the zone it was written in — but "which day is it now" is a
  /// wall-clock question, answered where the user physically is. `todayAsDay`
  /// makes that split, and so do `daysUntil` and the reminder planner's
  /// `leadDaysOf`.
  ///
  /// Reading BOTH sides in UTC — which is what this did — made the widget the
  /// only surface answering on a different calendar, between local midnight and
  /// UTC midnight: three hours a night in Kyiv, where the rail said "Renews
  /// Tomorrow" and the widget beside it said "in 2 days" for the same charge.
  ///
  /// The LANGUAGE is the app's, not the device's. `RelativeDateTimeFormatter`
  /// defaults to the extension process's `Locale.current`, which follows the
  /// DEVICE — so an app running under a per-app language drew English labels
  /// from the snapshot over a Ukrainian "сьогодні" formatted here.
  func dueText(locale: String?) -> String? {
    guard let due else { return nil }

    let days =
      Self.utcCalendar.dateComponents(
        [.day],
        from: Self.today,
        // Floored rather than trusted: a stored day is already a UTC midnight,
        // but a legacy value can carry a time of day.
        to: Self.utcCalendar.startOfDay(for: due)
      ).day ?? 0

    let formatter = RelativeDateTimeFormatter()
    // `.named` is what turns 0 and 1 into "today" and "tomorrow" rather than
    // "in 0 days" and "in 1 day".
    formatter.dateTimeStyle = .named
    formatter.locale = locale.map(Locale.init(identifier:)) ?? Locale.current
    return formatter.localizedString(from: DateComponents(day: days))
  }

  /// The device's calendar day, expressed as the UTC midnight this app stores
  /// days as. The Swift half of `toIsoDay(new Date())`, and it has to be read
  /// per call: an extension process outlives midnight.
  static var today: Date {
    utcCalendar.date(
      from: Calendar.current.dateComponents([.year, .month, .day], from: Date()))
      ?? utcCalendar.startOfDay(for: Date())
  }

  /// The calendar STORED days are expressed in — not the one "today" is read in.
  static let utcCalendar: Calendar = {
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? calendar.timeZone
    return calendar
  }()

  private static let isoWithFractionalSeconds: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()
  private static let iso = ISO8601DateFormatter()
}

enum WidgetStore {
  /// Must match `WIDGET_APP_GROUP` in `src/shared/lib/widget/sync.ts` and the
  /// entitlement in both `app.json` and `expo-target.config.js`.
  static let appGroup = "group.cc.subeye.app"
  static let key = "snapshot"

  static func read() -> Snapshot? {
    guard
      let defaults = UserDefaults(suiteName: appGroup),
      let json = defaults.string(forKey: key),
      let data = json.data(using: .utf8)
    else { return nil }

    return try? JSONDecoder().decode(Snapshot.self, from: data)
  }
}

enum Favicon {
  /// The same Google endpoint `shared/ui/brand-logo.tsx` uses, fetched HERE
  /// rather than shipped inside the snapshot.
  ///
  /// A widget cannot load a remote image while rendering, so the alternative was
  /// base64-ing every logo into shared `UserDefaults` on the JS side and keeping
  /// a cache to stop re-downloading them. Fetching in the timeline provider is a
  /// third of the code and `URLCache` does the caching for free.
  static func load(_ domains: [String]) async -> [String: Data] {
    await withTaskGroup(of: (String, Data?).self) { group in
      for domain in Set(domains) {
        group.addTask { (domain, await fetch(domain)) }
      }

      var logos: [String: Data] = [:]
      for await (domain, data) in group {
        if let data { logos[domain] = data }
      }
      return logos
    }
  }

  private static func fetch(_ domain: String) async -> Data? {
    guard
      let encoded = domain.addingPercentEncoding(
        withAllowedCharacters: .urlQueryAllowed),
      let url = URL(
        string: "https://www.google.com/s2/favicons?domain=\(encoded)&sz=128")
    else { return nil }

    var request = URLRequest(url: url)
    // A logo is never worth stalling a timeline for. A missing one degrades to
    // the same letter tile the app draws; a hung request would degrade to a
    // widget that never redraws at all.
    request.timeoutInterval = 5
    request.cachePolicy = .returnCacheDataElseLoad

    return try? await URLSession.shared.data(for: request).0
  }
}
