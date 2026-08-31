import { Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useCalendarMonth } from "@/entities/calendar";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { fullDayLabel, needsDayTotal } from "../model/month";
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
          sheet's chrome that depends on which day was tapped — and it is the
          ONLY place the day is named. A sheet that opens exactly one day does
          not need to say which one twice, and it used to: a short date in the
          bar over a long one beneath it.

          The day itself, with no verb. "Renewing 30 Sep" was wrong the moment
          a day held only a cancellation, and every row already says what it
          is. */}
      <Stack.Screen options={{ title: valid ? fullDayLabel(iso) : "" }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
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

        {/* AFTER the rows, and in their rhythm — a sum belongs under the column
            it sums, the way a receipt prints one. It used to be a bordered card
            above them, which is the dashboard's stat vocabulary: chrome the
            rows below it do not have, an uppercase label competing with the
            title, and a figure announced before anything had been added up. */}
        {day && needsDayTotal(day) ? (
          <View style={styles.total}>
            <Text style={styles.totalLabel}>{m.calendar_total()}</Text>
            <Text style={styles.totalAmount}>
              {formatMoney(day.total, day.events[0]?.currencyCode ?? "")}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  total: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { flexShrink: 1, fontSize: 15, color: colors.muted },
  totalAmount: {
    flexShrink: 0,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  empty: {
    paddingVertical: 26,
    textAlign: "center",
    fontSize: 15,
    color: colors.muted,
  },
});
