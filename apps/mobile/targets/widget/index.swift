import SwiftUI
import UIKit
import WidgetKit

// The app's tokens, copied rather than shared: `src/shared/ui/theme.ts` cannot
// be imported from Swift, and the plugin's asset-catalog colours would put the
// same six values in a third place. Keep these in step with `colors` there.
private enum Theme {
  static let bg = Color(hex: 0x0F11_15)
  static let surface = Color(hex: 0x1F23_2B)
  static let text = Color(hex: 0xF2F4_F8)
  static let muted = Color(hex: 0x98A0_AE)
  static let accent = Color(hex: 0x33A4_53)
  static let danger = Color(hex: 0xF871_71)
}

extension Color {
  fileprivate init(hex: UInt32) {
    self.init(
      .sRGB,
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255)
  }
}

private func deepLink(_ path: String) -> URL? {
  // Three slashes: an empty authority, so expo-router sees "/subscriptions/x"
  // as a path rather than "subscriptions" as a host.
  URL(string: "subeye://\(path)")
}

// MARK: - Timeline

struct SubEyeEntry: TimelineEntry {
  let date: Date
  let snapshot: Snapshot?
  let logos: [String: Data]
}

struct SubEyeProvider: TimelineProvider {
  // Reads the store rather than returning nil. `placeholder` must be
  // synchronous, which is why it skips the logos — but skipping the snapshot too
  // meant the gallery and every redacted preview rendered the "no data" eye over
  // a perfectly good snapshot sitting on disk. A UserDefaults read is cheap
  // enough to do here; a network fetch is not.
  func placeholder(in context: Context) -> SubEyeEntry {
    SubEyeEntry(date: Date(), snapshot: WidgetStore.read(), logos: [:])
  }

  // Loads logos too, not just the snapshot: this is what the widget GALLERY
  // renders, and a preview full of letter tiles undersells the thing it is
  // trying to sell.
  func getSnapshot(in context: Context, completion: @escaping (SubEyeEntry) -> Void) {
    Task {
      let snapshot = WidgetStore.read()
      let logos = await Favicon.load(snapshot?.items.compactMap(\.domain) ?? [])
      completion(SubEyeEntry(date: Date(), snapshot: snapshot, logos: logos))
    }
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SubEyeEntry>) -> Void) {
    Task {
      let snapshot = WidgetStore.read()
      let logos = await Favicon.load(snapshot?.items.compactMap(\.domain) ?? [])
      let entry = SubEyeEntry(date: Date(), snapshot: snapshot, logos: logos)

      // Midnight is not a nicety. `.relative` formats to a fixed string at
      // render time, so without a daily redraw a row written today would still
      // read "tomorrow" the morning the payment actually lands — and the month
      // total would carry into the next month.
      //
      // UTC midnight, because that is when `dueText` changes its answer: the day
      // difference it renders is counted in a UTC calendar, like every other
      // date in the app. Redrawing at the device's midnight instead left the
      // wording stale for the length of the user's offset.
      let midnight =
        WidgetItem.utcCalendar.nextDate(
          after: Date(),
          matching: DateComponents(hour: 0, minute: 0),
          matchingPolicy: .nextTime)
        ?? Date().addingTimeInterval(60 * 60)

      completion(Timeline(entries: [entry], policy: .after(midnight)))
    }
  }
}

// MARK: - Pieces

private struct Logo: View {
  let name: String
  let data: Data?
  var size: CGFloat = 30

  var body: some View {
    Group {
      if let data, let image = UIImage(data: data) {
        Image(uiImage: image).resizable().scaledToFill()
      } else {
        // The app's own fallback: the initial on a flat tile. A subscription
        // with no brand domain and one whose favicon 404s must look identical.
        Text(String(name.prefix(1)).uppercased())
          .font(.system(size: size * 0.42, weight: .bold))
          .foregroundStyle(Theme.text)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .background(Theme.surface)
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
  }
}

private struct Caption: View {
  let text: String

  var body: some View {
    Text(text)
      .font(.system(size: 10, weight: .semibold))
      .textCase(.uppercase)
      .kerning(0.5)
      .foregroundStyle(Theme.muted)
      .lineLimit(1)
  }
}

private struct Delta: View {
  let amount: String
  let label: String
  let up: Bool

  // The one place brand green is allowed to mean "good": this is a DIRECTION of
  // change, not a balance, exactly as on Home's next-month chip. Every other
  // amount in this widget stays neutral — money leaving is not a win.
  private var tint: Color { up ? Theme.danger : Theme.accent }

  var body: some View {
    // The comparison sits UNDER the capsule rather than inside it. "₴673 проти
    // мин. міс." wrapped to two lines inside a pill, which reads as a squeezed
    // button; the amount is the figure worth a coloured chip, and what it is
    // measured against is a caption.
    VStack(alignment: .leading, spacing: 3) {
      HStack(spacing: 3) {
        Image(systemName: up ? "arrow.up" : "arrow.down")
          .font(.system(size: 9, weight: .bold))
        Text(amount)
          .font(.system(size: 12, weight: .bold))
          .lineLimit(1)
      }
      .foregroundStyle(tint)
      .padding(.horizontal, 8)
      .padding(.vertical, 4)
      .background(tint.opacity(0.14), in: Capsule())

      Text(label)
        .font(.system(size: 9.5))
        .foregroundStyle(Theme.muted)
        .lineLimit(2)
    }
  }
}

private struct RenewalRow: View {
  let item: WidgetItem
  let logo: Data?
  let locale: String?

  var body: some View {
    HStack(spacing: 8) {
      Logo(name: item.name, data: logo, size: 24)
      VStack(alignment: .leading, spacing: 1) {
        Text(item.name)
          .font(.system(size: 12.5, weight: .semibold))
          .foregroundStyle(Theme.text)
          .lineLimit(1)
        HStack(spacing: 4) {
          Text(item.amount)
          if let dueText = item.dueText(locale: locale) {
            Text("·")
            Text(dueText)
          }
        }
        .font(.system(size: 11))
        .foregroundStyle(Theme.muted)
        .lineLimit(1)
      }
      Spacer(minLength: 0)
    }
  }
}

/// Shown when there is no snapshot at all — signed out, or the app has never
/// been opened since the widget was added.
///
/// Deliberately wordless: every string this extension renders comes from the
/// app, so with no snapshot there is nothing it could say without hard-coding
/// English into a bilingual app.
private struct NoData: View {
  var body: some View {
    Image(systemName: "eye")
      .font(.system(size: 22, weight: .semibold))
      .foregroundStyle(Theme.muted)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

private struct Locked: View {
  let snapshot: Snapshot

  var body: some View {
    // Centred as one block rather than pinned to the corners. Pushed apart by a
    // Spacer this read as an empty card at the medium size, where the gap between
    // the glyph and the copy was most of the widget.
    VStack(alignment: .leading, spacing: 8) {
      Image(systemName: "lock.fill")
        .font(.system(size: 15, weight: .semibold))
        .foregroundStyle(Theme.accent)
      Text(snapshot.lockTitle)
        .font(.system(size: 14, weight: .bold))
        .foregroundStyle(Theme.text)
        .lineLimit(3)
        .minimumScaleFactor(0.8)
      Text(snapshot.lockCta)
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(Theme.bg)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Theme.accent, in: Capsule())
        .padding(.top, 2)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .widgetURL(deepLink("/paywall"))
  }
}

// MARK: - Families

private struct SmallWidget: View {
  let snapshot: Snapshot
  let logos: [String: Data]

  /// "today · +4 also due". Two muted facts about the same payment, so they take
  /// one line rather than two — in a square this small the vertical room buys
  /// more than the separation does.
  private func footnote(for item: WidgetItem) -> String? {
    let parts = [item.dueText(locale: snapshot.locale), snapshot.alsoDue]
      .compactMap { $0 }
    return parts.isEmpty ? nil : parts.joined(separator: " · ")
  }

  var body: some View {
    if let item = snapshot.items.first {
      // No "next payment" caption. A small widget showing one brand, one price
      // and a due date IS the next payment; the caption spent a whole line
      // restating the layout, and the rows it left had to be jammed together at
      // spacing 0 to fit — which buried the subscription's own name between a
      // label and a 24pt number.
      VStack(alignment: .leading, spacing: 4) {
        Logo(name: item.name, data: item.domain.flatMap { logos[$0] }, size: 32)
        Spacer(minLength: 6)
        Text(item.name)
          .font(.system(size: 16, weight: .semibold))
          .foregroundStyle(Theme.text)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Text(item.amount)
          .font(.system(size: 26, weight: .heavy))
          .foregroundStyle(Theme.text)
          .lineLimit(1)
          .minimumScaleFactor(0.5)
        if let footnote = footnote(for: item) {
          Text(footnote)
            .font(.system(size: 11.5, weight: .medium))
            .foregroundStyle(Theme.muted)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .widgetURL(deepLink("/subscriptions/\(item.id)"))
    } else {
      VStack(alignment: .leading, spacing: 4) {
        Caption(text: snapshot.monthLabel)
        Text(snapshot.monthTotal)
          .font(.system(size: 26, weight: .heavy))
          .foregroundStyle(Theme.text)
          .lineLimit(1)
          .minimumScaleFactor(0.5)
        Text(snapshot.emptyLabel)
          .font(.system(size: 11))
          .foregroundStyle(Theme.muted)
          .lineLimit(2)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .widgetURL(deepLink("/"))
    }
  }
}

private struct MediumWidget: View {
  let snapshot: Snapshot
  let logos: [String: Data]

  var body: some View {
    HStack(alignment: .top, spacing: 14) {
      VStack(alignment: .leading, spacing: 3) {
        Caption(text: snapshot.monthLabel)
        Text(snapshot.monthTotal)
          .font(.system(size: 27, weight: .heavy))
          .foregroundStyle(Theme.text)
          .lineLimit(1)
          .minimumScaleFactor(0.5)
        Spacer(minLength: 4)
        if let delta = snapshot.delta {
          Delta(
            amount: delta, label: snapshot.deltaLabel, up: snapshot.deltaUp)
        }
      }
      // Fixed, not proportional: the amount's width varies with the currency and
      // the magnitude, and a flexible column would slide the renewal rows
      // sideways every time the total crossed a digit.
      .frame(width: 116, alignment: .leading)

      VStack(alignment: .leading, spacing: 7) {
        Caption(text: snapshot.upcomingLabel)
        if snapshot.items.isEmpty {
          Text(snapshot.emptyLabel)
            .font(.system(size: 12))
            .foregroundStyle(Theme.muted)
        } else {
          ForEach(snapshot.items) { item in
            Link(destination: deepLink("/subscriptions/\(item.id)") ?? URL(string: "subeye://")!) {
              RenewalRow(
                item: item,
                logo: item.domain.flatMap { logos[$0] },
                locale: snapshot.locale
              )
            }
          }
        }
        Spacer(minLength: 0)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(deepLink("/"))
  }
}

// MARK: - Entry point

struct SubEyeWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: SubEyeEntry

  var body: some View {
    if let snapshot = entry.snapshot {
      if snapshot.locked {
        Locked(snapshot: snapshot)
      } else if family == .systemMedium {
        MediumWidget(snapshot: snapshot, logos: entry.logos)
      } else {
        SmallWidget(snapshot: snapshot, logos: entry.logos)
      }
    } else {
      NoData()
    }
  }
}

struct SubEyeWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "SubEyeWidget", provider: SubEyeProvider()) { entry in
      SubEyeWidgetView(entry: entry)
        .containerBackground(Theme.bg, for: .widget)
    }
    .configurationDisplayName("SubEye")
    .description("Your next payment and what this month costs.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct SubEyeWidgetBundle: WidgetBundle {
  var body: some Widget {
    SubEyeWidget()
  }
}
