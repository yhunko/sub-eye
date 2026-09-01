import DateTimePicker from "@react-native-community/datetimepicker";
import { Fragment, useState } from "react";
import { Platform } from "react-native";
import { getLocale, m } from "@/shared/i18n";
import { LEAD_DAY_CHOICES } from "@/shared/lib/notifications";
import { Divider, Row, RowCheck } from "@/shared/ui/list-row";

/**
 * The reminder controls themselves, with no opinion about what is around them.
 *
 * Their own file because TWO surfaces render them: the settings screen, and the
 * sheet the app offers right after a first subscription is saved. They are the
 * same rows in both — a second, "simpler" copy for the sheet is how the two
 * would start disagreeing about what a lead day is.
 */

/**
 * Built per call from the APP's locale, never once at module scope.
 *
 * The same trap as `m.someKey()` at module scope: a formatter constructed at
 * import freezes whatever locale was active then — and `undefined` resolves to
 * the *device* locale, which is not what the app is rendering. It put an
 * English "Aug 2 at 9:00 AM" in the middle of a Ukrainian sentence.
 */
const timeFormat = () =>
  new Intl.DateTimeFormat(getLocale(), { hour: "2-digit", minute: "2-digit" });

/** A Date carrying only a wall-clock time, for the picker to edit. */
const asClock = (hour: number, minute: number) =>
  new Date(2000, 0, 1, hour, minute);

const LEAD_LABELS: Record<number, () => string> = {
  0: m.notifs_leadSameDay,
  1: m.notifs_leadOneDay,
  3: m.notifs_leadThreeDays,
  7: m.notifs_leadOneWeek,
};

/**
 * The time row. iOS renders the picker inline and compact, straight in the row;
 * Android has no inline form, so the row opens the system dialog and shows the
 * value itself.
 */
export function TimeRow({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  const [androidOpen, setAndroidOpen] = useState(false);
  const value = asClock(hour, minute);
  const apply = (next: Date) => onChange(next.getHours(), next.getMinutes());

  if (Platform.OS === "ios") {
    return (
      <Row
        ios="clock"
        android="schedule"
        label={m.notifs_time()}
        accessory={
          <DateTimePicker
            value={value}
            mode="time"
            display="compact"
            themeVariant="dark"
            onValueChange={(_event, next) => apply(next)}
          />
        }
      />
    );
  }

  return (
    <>
      <Row
        ios="clock"
        android="schedule"
        label={m.notifs_time()}
        value={timeFormat().format(value)}
        onPress={() => setAndroidOpen(true)}
      />
      {androidOpen ? (
        <DateTimePicker
          value={value}
          mode="time"
          // Both handlers unmount the dialog, because only `onValueChange`
          // fires on a pick. Without `onDismiss` a cancelled dialog leaves
          // `androidOpen` true, and the row cannot be opened a second time.
          onValueChange={(_event, next) => {
            setAndroidOpen(false);
            apply(next);
          }}
          onDismiss={() => setAndroidOpen(false)}
        />
      ) : null}
    </>
  );
}

export function LeadDayRows({
  selected,
  locked,
  onToggle,
}: {
  selected: number[];
  locked: boolean;
  onToggle: (day: number) => void;
}) {
  return (
    <>
      {LEAD_DAY_CHOICES.map((day, index) => {
        const checked = selected.includes(day);
        return (
          <Fragment key={day}>
            {index > 0 ? <Divider /> : null}
            <Row
              ios="calendar"
              android="event"
              label={LEAD_LABELS[day]?.() ?? String(day)}
              onPress={() => onToggle(day)}
              // The badge sits on the rows a free install cannot reach, not on
              // the one it already has — a "Pro" tag beside a live checkmark
              // would say the feature they are using is not theirs.
              value={locked && !checked ? m.paywall_badge() : undefined}
              accessory={<RowCheck checked={checked} />}
            />
          </Fragment>
        );
      })}
    </>
  );
}
