import { StyleSheet, Text, View } from "react-native";
import type { TimelineRow as Row } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";
import { useLargeText } from "@/shared/ui/use-large-text";

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

export function TimelineRow({ row, last }: { row: Row; last?: boolean }) {
  // `scheduledChange` is the one kind whose label reads as a state. Once the
  // change has taken effect the phase simply IS the price, so it drops the
  // badge the way `standard` does — keeping it made an applied change look
  // like it had not happened yet.
  const label =
    row.kind === "scheduledChange" && !row.isUpcoming
      ? null
      : KIND_LABEL[row.kind];
  const range = row.to
    ? m.phase_range({ from: row.from, to: row.to })
    : m.phase_since({ date: row.from });

  const stacked = useLargeText();

  return (
    <View
      style={[styles.row, stacked && styles.rowStacked, last && styles.lastRow]}
    >
      <Text style={[styles.price, row.isActive && styles.active]}>
        {row.price}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.range}>{range}</Text>
        {label ? <Text style={styles.kind}>{label()}</Text> : null}
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
  // The price and the dates it covers are one sentence read left to right; at
  // the accessibility sizes they are two lines read top to bottom.
  rowStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
  },
  // The card the rows now sit in draws its own edge; a divider under the last
  // one would double it.
  lastRow: { borderBottomWidth: 0, paddingBottom: 2 },
  price: {
    fontSize: 15,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  active: { color: colors.text, fontWeight: "700" },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 4,
    flexShrink: 1,
  },
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
