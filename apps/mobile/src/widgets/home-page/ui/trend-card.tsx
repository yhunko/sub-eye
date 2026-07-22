import type { MonthlyTrendPoint } from "@subeye/shared";
import { StyleSheet, Text, View } from "react-native";
import { getLocale, m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

const BAR_HEIGHT = 72;

// The server sends each point as the UTC instant of the month's *local* start,
// so a UTC+3 user's July point reads "2026-06-30T21:00Z". Nudging a day forward
// lands inside the intended month for every offset from -12 to +14, which lets
// us format in UTC and skip Hermes' unreliable IANA support.
const monthDate = (iso: string) => new Date(Date.parse(iso) + 86_400_000);

const monthLabel = (iso: string, style: "short" | "long") => {
  const text = new Intl.DateTimeFormat(getLocale(), {
    month: style,
    timeZone: "UTC",
    ...(style === "long" ? { year: "numeric" } : {}),
  }).format(monthDate(iso));

  // uk abbreviates with a trailing period ("лип."), which collides with the
  // apostrophe in "лип.'26". Short ticks only — the long form's own "2026 р."
  // ends in a period that belongs there. English is unaffected either way.
  return style === "short" ? text.replace(/\.$/, "") : text;
};

const shortYear = (iso: string) =>
  `'${String(monthDate(iso).getUTCFullYear()).slice(-2)}`;

/**
 * A year of forecast spend, sampled every other month.
 *
 * `monthlyTrend` is 12 points starting one month back, so the odd indices are
 * exactly "this month, then every second month" — six bars, no resampling math.
 * Index 0 (last month) survives only as the baseline for the delta badge.
 */
export function TrendCard({
  currency,
  monthlyTrend,
}: {
  currency: string;
  monthlyTrend: MonthlyTrendPoint[];
}) {
  const current = monthlyTrend[1];
  if (!current) return null;

  const points = monthlyTrend.filter((_, index) => index % 2 === 1);
  const peak = Math.max(...points.map((point) => point.amount));

  const previous = monthlyTrend[0]?.amount ?? 0;
  // No baseline, no percentage: dividing by a zero month yields Infinity, and
  // "+∞%" is not a number a user can act on.
  const delta =
    previous > 0 ? ((current.amount - previous) / previous) * 100 : null;
  const rising = (delta ?? 0) >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{m.home_trendTitle()}</Text>
          <Text style={styles.subtitle}>{m.home_trendSubtitle()}</Text>
        </View>
        {delta === null ? null : (
          <Text
            style={[styles.badge, rising ? styles.badgeUp : styles.badgeDown]}
            maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
          >
            {rising ? "↑" : "↓"} {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </Text>
        )}
      </View>

      <View style={styles.chart}>
        {points.map((point, index) => {
          const isCurrent = index === 0;
          return (
            <View key={point.date} style={styles.column}>
              <View style={styles.barSlot}>
                <View
                  style={[
                    styles.bar,
                    {
                      // `peak` is 0 only when the user has no spend at all, and
                      // then every bar is a flat 2px rule rather than NaN.
                      height: peak > 0 ? (point.amount / peak) * BAR_HEIGHT : 2,
                      backgroundColor: isCurrent
                        ? colors.accent
                        : point.amount === peak
                          ? colors.danger
                          : colors.surfaceAlt,
                    },
                  ]}
                />
              </View>
              <Text
                style={[styles.tick, isCurrent && styles.tickCurrent]}
                numberOfLines={1}
                maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
              >
                {monthLabel(point.date, "short")}
                {shortYear(point.date)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>
          {monthLabel(current.date, "long")}
        </Text>
        <Text
          style={styles.footerValue}
          maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
        >
          {formatMoney(current.amount, currency)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 2,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 19, fontWeight: "700", color: colors.text },
  subtitle: { marginTop: 2, fontSize: 12.5, color: colors.muted },
  badge: {
    overflow: "hidden",
    fontSize: 14,
    fontWeight: "700",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeUp: { color: colors.danger, backgroundColor: colors.dangerSoft },
  badgeDown: { color: colors.accent, backgroundColor: colors.accentSoft },
  chart: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  column: { flex: 1, alignItems: "center", gap: 7 },
  barSlot: {
    width: "100%",
    height: BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    maxWidth: 26,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  tick: { fontSize: 10.5, fontWeight: "500", color: colors.muted },
  tickCurrent: { fontWeight: "700", color: colors.accent },
  footer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLabel: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "capitalize",
  },
  footerValue: { fontSize: 15, fontWeight: "700", color: colors.text },
});
