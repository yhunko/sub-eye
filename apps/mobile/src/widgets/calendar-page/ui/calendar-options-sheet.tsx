import { Fragment } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { m } from "@/shared/i18n";
import { Divider, Row, RowCheck, Section } from "@/shared/ui/list-row";
import { colors } from "@/shared/ui/theme";
import {
  calendarSettings,
  useCalendarSettings,
  WEEK_STARTS,
} from "../model/settings";

const WEEK_LABEL = {
  monday: m.calendar_weekMonday,
  sunday: m.calendar_weekSunday,
};

/**
 * How the calendar draws itself, on a sheet over it.
 *
 * A sheet rather than the UIMenu the subscriptions list uses for its filters,
 * which is this app's usual answer. The distinction is what the controls ARE: a
 * filter is a gesture you make for the next thirty seconds and a menu suits it,
 * while these two are standing preferences that persist — and a preference
 * belongs on a settings surface, where its footnote can say what it does. A menu
 * would also have to be built twice, since expo-router only swaps native bar
 * items in on iOS.
 *
 * Every row writes on tap. There is nothing to commit, and the grid repaints
 * underneath as each one moves, which is the point of a sheet over a screen.
 */
export function CalendarOptionsSheet() {
  const settings = useCalendarSettings();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Section title={m.calendar_weekStart()}>
        {WEEK_STARTS.map((value, index) => (
          <Fragment key={value}>
            {index > 0 ? <Divider /> : null}
            <Row
              ios="calendar"
              android="calendar_month"
              label={WEEK_LABEL[value]()}
              onPress={() => calendarSettings.set({ weekStart: value })}
              accessory={<RowCheck checked={settings.weekStart === value} />}
            />
          </Fragment>
        ))}
      </Section>

      <Section footnote={m.calendar_showTotalsHint()}>
        <Row
          ios="sum"
          android="functions"
          label={m.calendar_showTotals()}
          toggle={{
            value: settings.showDayTotals,
            disabled: false,
            onValueChange: (next) =>
              calendarSettings.set({ showDayTotals: next }),
          }}
        />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 22,
    backgroundColor: colors.bg,
  },
});
