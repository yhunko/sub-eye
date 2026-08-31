import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { categoryColors, colors } from "@/shared/ui/theme";

/**
 * Schematic pictures of what Pro buys, for the paywall's rail.
 *
 * Deliberately NOT screenshots. Bundled PNGs would need one per locale, would
 * be captured at one text size, and would go stale the first time a screen
 * moves — silently, because nothing fails when a picture is wrong. These are
 * drawn from the same tokens the real screens use, so they follow the theme for
 * free and can only ever be a bit abstract, never a bit WRONG.
 *
 * They are also deliberately schematic rather than faithful: an almost-exact
 * copy of a screen invites the reader to compare it against the real thing.
 * Blocks and bars promise a shape, which is all a preview should promise.
 *
 * Text is kept to strings the app already ships. A preview carrying its own
 * copy would be a second catalogue to translate, and amounts are avoided
 * outright — a mock priced in dollars in front of a hryvnia user reads as a
 * screen from a different app.
 */

/** A reminder, as it lands on the lock screen. */
export function RemindersPreview() {
  return (
    <View style={styles.notification}>
      <View style={styles.appIcon}>
        <SymbolView
          name={{ ios: "eye.fill", android: "visibility" }}
          size={17}
          tintColor={colors.accent}
        />
      </View>
      <View style={styles.notificationText}>
        <Text style={styles.notificationTitle}>SubEye</Text>
        <Text style={styles.notificationBody}>
          {m.home_attnPayment({ when: m.when_tomorrow().toLowerCase() })}
        </Text>
      </View>
    </View>
  );
}

/** One price becoming another, twice — a trial, an intro, then standard. */
export function PricingPreview() {
  return (
    <View style={styles.timeline}>
      {[26, 46, 74].map((height, index) => (
        <View key={height} style={styles.phase}>
          <View
            style={[
              styles.phaseBar,
              { height },
              index === 0 && styles.phaseBarLive,
            ]}
          />
        </View>
      ))}
    </View>
  );
}

/** Where the money goes, ranked. */
export function CategoriesPreview() {
  return (
    <View style={styles.bars}>
      {[100, 68, 41].map((width, index) => (
        <View key={width} style={styles.barRow}>
          <View
            style={[
              styles.barDot,
              { backgroundColor: categoryColors[index] as string },
            ]}
          />
          <View
            style={[
              styles.bar,
              {
                width: `${width}%`,
                backgroundColor: categoryColors[index] as string,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

/** The Home Screen widget: a figure and what is coming. */
export function WidgetsPreview() {
  return (
    <View style={styles.widget}>
      <View style={styles.widgetLabel} />
      <View style={styles.widgetFigure} />
      <View style={styles.widgetRule} />
      {[0, 1].map((row) => (
        <View key={row} style={styles.widgetRow}>
          <View style={styles.widgetAvatar} />
          <View style={styles.widgetLine} />
          <View style={styles.widgetAmount} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  notification: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    alignSelf: "stretch",
    marginHorizontal: 24,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  appIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationText: { flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 2 },
  notificationTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  notificationBody: { fontSize: 13, color: colors.muted },

  timeline: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10,
  },
  phase: { alignItems: "center" },
  phaseBar: {
    width: 46,
    borderRadius: 9,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phaseBarLive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
  },

  bars: { alignSelf: "stretch", marginHorizontal: 34, gap: 14 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  barDot: { width: 9, height: 9, borderRadius: 999 },
  bar: { flexShrink: 1, height: 11, borderRadius: 999 },

  widget: {
    width: 176,
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 20,
    padding: 15,
  },
  widgetLabel: {
    width: 52,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  widgetFigure: {
    width: 108,
    height: 19,
    borderRadius: 6,
    backgroundColor: colors.text,
  },
  widgetRule: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  widgetRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  widgetAvatar: {
    width: 15,
    height: 15,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  widgetLine: {
    flexGrow: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  widgetAmount: {
    width: 30,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.muted,
  },
});
