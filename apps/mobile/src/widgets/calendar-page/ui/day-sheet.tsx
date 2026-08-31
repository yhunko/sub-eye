import { Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useCalendarMonth } from "@/entities/calendar";
import { m } from "@/shared/i18n";
import { formatMoney, formatShortDate } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { fullDayLabel, nearbyCountdown, needsDayTotal } from "../model/month";
import { EventRow } from "./event-row";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * One day's breakdown, as a sheet over the grid.
 *
 * Reads the MONTH it belongs to rather than fetching a day: the grid behind this
 * has already put that month in the cache, so opening a day costs a `find` and
 * no projection at all. It is also the only way the two can agree — a separate
 * day query would be a second answer to "what happens on the 12th".
 *
 * Deliberately not `subscriptions/due/[date]`, which looks like the same screen
 * and is not: that one lists subscriptions whose single `nextPaymentDate` falls
 * on the day, so it holds nothing at all for the second and third charge of a
 * weekly plan — and it lives in another tab's stack, which a push from here
 * would switch to underneath the sheet.
 *
 * The ScrollView is the ROOT, with the header sticky inside it. A `flex: 1`
 * scroller nested under a `flex: 1` View is the trap `nativeSheetChrome`
 * documents: inside a form sheet it has no intrinsic height, and this shipped
 * once with the rows painted over the title.
 */
export function DaySheet({ date }: { date: string }) {
  const router = useRouter();

  // A route param is input from outside the process even when this app wrote it.
  const valid = ISO_DAY.test(date);
  const month = valid ? `${date.slice(0, 7)}-01T00:00:00.000Z` : "";
  const calendar = useCalendarMonth(month, valid);

  const day = calendar.data?.days.find(
    (entry) => entry.date.slice(0, 10) === date,
  );

  const iso = `${date}T00:00:00.000Z`;

  return (
    <>
      {/* Set here rather than on the layout: it is the one piece of this
          sheet's chrome that depends on which day was tapped. */}
      <Stack.Screen
        options={{
          title: m.due_title({ date: valid ? formatShortDate(iso) : "" }),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {valid ? (
          <Text style={styles.caption}>
            {[fullDayLabel(iso), nearbyCountdown(iso)]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        ) : null}

        {day && needsDayTotal(day) ? (
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>{m.due_total()}</Text>
            <Text style={styles.summaryAmount}>
              {formatMoney(day.total, day.events[0]?.currencyCode ?? "")}
            </Text>
          </View>
        ) : null}

        {day?.events.length ? (
          day.events.map((event) => (
            <EventRow
              key={event.key}
              event={event}
              onPress={() => {
                // Dismiss first: a push from inside a sheet that stays up leaves
                // the detail screen behind it.
                router.back();
                router.push({
                  pathname: "/subscriptions/[id]",
                  params: { id: event.subscriptionId },
                });
              }}
            />
          ))
        ) : (
          <Text style={styles.empty}>{m.due_empty()}</Text>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 },
  caption: { fontSize: 13, color: colors.muted, paddingBottom: 14 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12.5,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.muted,
  },
  summaryAmount: { fontSize: 22, fontWeight: "800", color: colors.text },
  empty: {
    paddingVertical: 26,
    textAlign: "center",
    fontSize: 15,
    color: colors.muted,
  },
});
