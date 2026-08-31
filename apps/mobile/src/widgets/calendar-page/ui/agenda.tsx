import type { CalendarDayDto } from "@subeye/model";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { formatMoney, todayAsDay } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { agendaDayLabel, nearbyCountdown, needsDayTotal } from "../model/month";
import { EventRow } from "./event-row";

function DayCard({
  day,
  now,
  onOpen,
}: {
  day: CalendarDayDto;
  now: Date;
  onOpen: (subscriptionId: string) => void;
}) {
  const when = nearbyCountdown(day.date, now);
  const isToday = Date.parse(day.date) === todayAsDay(now);
  const currency = day.events[0]?.currencyCode ?? "";

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.heading}>
          <Text style={styles.day}>{agendaDayLabel(day.date)}</Text>
          {when ? (
            <Text style={[styles.when, isToday && styles.whenToday]}>
              {when}
            </Text>
          ) : null}
        </View>
        {needsDayTotal(day) ? (
          <Text style={styles.total}>{formatMoney(day.total, currency)}</Text>
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
 * The grid answers "when", and at 14pt logos it can only ever answer that; this
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
    <View style={styles.list}>
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
        <DayCard key={day.date} day={day} now={now} onOpen={onOpen} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  earlier: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 6,
    paddingBottom: 2,
  },
  earlierLabel: { fontSize: 12.5, color: colors.muted },
  earlierTotal: { fontSize: 12.5, fontWeight: "600", color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  heading: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  day: { fontSize: 16, fontWeight: "700", color: colors.text },
  when: { fontSize: 12.5, color: colors.muted },
  whenToday: { color: colors.accent },
  total: {
    flexShrink: 0,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  empty: {
    paddingVertical: 30,
    textAlign: "center",
    fontSize: 15,
    color: colors.muted,
  },
});
