import type { CalendarDayDto } from "@subeye/model";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { formatMoney, todayAsDay } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { useLargeText } from "@/shared/ui/use-large-text";
import { agendaDayLabel, nearbyCountdown, needsDayTotal } from "../model/month";
import { EventRow } from "./event-row";

/**
 * One day: a borderless heading, then its events.
 *
 * NOT a card. Every day used to be a bordered, rounded box — chrome around
 * content that needs none, and a shape this app otherwise reserves for a
 * grouped control or a single figure. The subscriptions list already answers
 * this: headings are borderless text on the page background, and the rows
 * beneath them are the thing being read.
 *
 * Muted heading over full-strength rows, for the same reason: the day is
 * scaffolding, the subscriptions are the content.
 */
function DayGroup({
  day,
  now,
  onOpen,
}: {
  day: CalendarDayDto;
  now: Date;
  onOpen: (subscriptionId: string) => void;
}) {
  const stacked = useLargeText();
  const when = nearbyCountdown(day.date, now);
  const isToday = Date.parse(day.date) === todayAsDay(now);

  return (
    <View>
      <View style={[styles.heading, stacked && styles.headingStacked]}>
        <View
          style={[styles.headingText, stacked && styles.headingTextStacked]}
        >
          <Text style={styles.day}>{agendaDayLabel(day.date)}</Text>
          {when ? (
            <Text style={[styles.when, isToday && styles.whenToday]}>
              {when}
            </Text>
          ) : null}
        </View>
        {needsDayTotal(day) ? (
          <Text style={styles.total}>
            {formatMoney(day.total, day.events[0]?.currencyCode ?? "")}
          </Text>
        ) : null}
      </View>
      {day.events.map((event) => (
        <EventRow
          key={event.key}
          event={event}
          onPress={() => onOpen(event.subscriptionId)}
        />
      ))}
    </View>
  );
}

/**
 * The month as a list, under the grid.
 *
 * The grid answers "when", and at 20pt logos it can only ever answer that; this
 * answers "what" without a tap. Days that have already gone are folded into a
 * single line — a month of settled charges is dead scroll, and by the 28th it
 * would be the only thing on screen — but a month with nothing left ahead shows
 * them all rather than collapsing to one summary line and a void.
 */
export function Agenda({
  days,
  onOpen,
  now = new Date(),
}: {
  days: CalendarDayDto[];
  onOpen: (subscriptionId: string) => void;
  now?: Date;
}) {
  const today = todayAsDay(now);
  const upcoming = days.filter((day) => Date.parse(day.date) >= today);
  const earlier = upcoming.length
    ? days.filter((day) => Date.parse(day.date) < today)
    : [];
  const shown = upcoming.length ? upcoming : days;

  if (!days.length) {
    return <Text style={styles.empty}>{m.calendar_empty()}</Text>;
  }

  const earlierTotal = earlier.reduce((sum, day) => sum + day.total, 0);

  return (
    <View>
      {earlier.length ? (
        <View style={styles.earlier}>
          <Text style={styles.earlierLabel}>{m.calendar_earlier()}</Text>
          <Text style={styles.earlierTotal}>
            {m.calendar_earlierTotal({
              amount: formatMoney(
                earlierTotal,
                earlier[0]?.events[0]?.currencyCode ?? "",
              ),
            })}
          </Text>
        </View>
      ) : null}
      {shown.map((day) => (
        <DayGroup key={day.date} day={day} now={now} onOpen={onOpen} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  earlier: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 6,
    paddingBottom: 2,
  },
  earlierLabel: { fontSize: 13, color: colors.muted },
  earlierTotal: { fontSize: 13, fontWeight: "600", color: colors.muted },

  heading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 6,
    paddingTop: 16,
    paddingBottom: 4,
  },
  // The total is the reason the heading carries one, so it wraps under the day
  // rather than competing for a line neither can win.
  headingStacked: { flexDirection: "column", alignItems: "flex-start", gap: 2 },
  headingText: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  headingTextStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 1,
  },
  day: { flexShrink: 1, fontSize: 15, fontWeight: "700", color: colors.muted },
  when: { fontSize: 13, color: colors.muted },
  whenToday: { color: colors.accent, fontWeight: "600" },
  total: {
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },

  empty: {
    paddingVertical: 30,
    textAlign: "center",
    fontSize: 15,
    color: colors.muted,
  },
});
