import { StyleSheet, Text, View } from "react-native";
import type { TimelineRow as Row } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// Message-function references, invoked at render time — calling m.*() here would
// freeze the label in whichever locale was active at import. `standard` is
// deliberately unlabelled: it is the default, and tagging every row hides the
// special ones.
const KIND_LABEL: Record<Row["kind"], (() => string) | null> = {
  trial: m.phase_trial,
  intro: m.phase_intro,
  scheduledChange: m.phase_scheduledChange,
  standard: null,
};

export function TimelineRow({ row }: { row: Row }) {
  const label = KIND_LABEL[row.kind];
  const range = row.to
    ? m.phase_range({ from: row.from, to: row.to })
    : m.phase_since({ date: row.from });

  return (
    <View style={styles.row}>
      <Text
        style={[styles.price, row.isActive && styles.active]}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {row.price}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.range} numberOfLines={1}>
          {range}
        </Text>
        {label ? (
          <Text
            style={styles.kind}
            maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
          >
            {label()}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  price: {
    fontSize: 15,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  active: { color: colors.text, fontWeight: "700" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  range: { fontSize: 13, color: colors.muted },
  kind: {
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.accent,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
});
