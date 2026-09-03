import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { dateLocale } from "@/shared/i18n";
import {
  daysUntil,
  formatCountdown,
  formatShortDate,
  toIsoDay,
} from "@/shared/lib/format";
import { Field } from "./field";
import { colors } from "./theme";

type DateProps = {
  /** For VoiceOver and the Android dialog — the control itself shows no label. */
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  /**
   * Renew uses this to make "not in the future" unreachable rather than
   * rejectable — the OS greys the days out, so there is no error to write.
   */
  maximumDate?: Date;
};

/**
 * The OS date control, as a trailing accessory rather than a row of its own.
 *
 * iOS is `UIDatePickerStyleCompact`: the date chip Calendar and Reminders use,
 * which opens Apple's calendar in a popover UIKit positions itself. That
 * replaced a hand-built modal over a wheel — the modal existed because an
 * INLINE wheel lands wherever its row happens to sit, so a field near the
 * bottom of a form opened a picker below the fold and the tap looked dead. A
 * popover cannot be off-screen, and the calendar grid is what people actually
 * read a date off.
 *
 * NO WIDTH OR HEIGHT HERE, deliberately. The Fabric view measures a dummy
 * `UIDatePicker` with `sizeThatFits` and pushes the result into shadow-node
 * state (`ios/fabric/RNDateTimePickerComponentView.mm`), so the chip is exactly
 * as wide as the locale's own date format needs — a fixed width clips Ukrainian.
 * That measurement only re-runs when `date`, `locale`, `mode` or `displayIOS`
 * change, which is why `key` carries the font scale: Dynamic Type grows the
 * chip's text with nothing else to tell Yoga about it, so the remount is what
 * keeps it from being cropped at the accessibility sizes.
 *
 * Android has no compact style — the chip is ours and it opens the system
 * dialog.
 */
export function DatePicker({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
}: DateProps) {
  const [open, setOpen] = useState(false);
  const { fontScale } = useWindowDimensions();

  if (Platform.OS !== "ios") {
    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${formatShortDate(toIsoDay(value))}`}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        >
          <Text style={styles.chipLabel}>
            {formatShortDate(toIsoDay(value))}
          </Text>
        </Pressable>
        {open ? (
          <DateTimePicker
            value={value}
            mode="date"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            // Both handlers close it, because only `onValueChange` fires on a
            // pick. Without `onDismiss` a cancelled dialog leaves `open` true
            // and the field cannot be opened a second time.
            onValueChange={(_event, date) => {
              setOpen(false);
              onChange(date);
            }}
            onDismiss={() => setOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <DateTimePicker
      key={fontScale}
      value={value}
      mode="date"
      display="compact"
      // The APP's locale, not the device's, which is what UIDatePicker defaults
      // to: an English UI on a Ukrainian phone printed "4 вер. 2026 р." in the
      // one control that renders its own text. `dateLocale` is the same tag
      // every Intl format here is built from, so the chip and the summary line
      // under it finally agree.
      locale={dateLocale()}
      accentColor={colors.accent}
      themeVariant="dark"
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      accessibilityLabel={label}
      onValueChange={(_event, date) => onChange(date)}
    />
  );
}

/**
 * `DatePicker` under a label of its own, for the sheets — pause, renew and
 * manage-pricing — which lay their controls out label-above rather than in the
 * form's grouped rows.
 *
 * The countdown beside it is what the user actually reads; the digits alone are
 * a string nobody checks. Forwards only — the first-payment field is an anchor
 * and is usually in the past, where a countdown has nothing true to say.
 */
export function NativeDateField({
  label,
  error,
  ...picker
}: DateProps & { error?: string }) {
  const days = daysUntil(toIsoDay(picker.value));

  return (
    <Field label={label} error={error}>
      <View style={styles.standalone}>
        <DatePicker label={label} {...picker} />
        {days >= 0 ? (
          <Text style={styles.countdown}>{formatCountdown(days)}</Text>
        ) : null}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  // Wraps rather than shrinks: the chip is natively sized and the countdown is
  // a whole phrase, so at the accessibility sizes the two take a line each.
  standalone: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  countdown: { fontSize: 13, color: colors.muted },
  chip: {
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipPressed: { backgroundColor: colors.border },
  chipLabel: { fontSize: 16, color: colors.text },
});
