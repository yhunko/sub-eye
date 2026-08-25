import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { m } from "@/shared/i18n";
import {
  daysUntil,
  formatCountdown,
  formatShortDate,
  toIsoDay,
} from "@/shared/lib/format";
import { ValueField } from "./field";
import { colors, LAYOUT_FONT_SCALE_MAX } from "./theme";

/**
 * The OS date picker, behind a row that says what the date MEANS.
 *
 * The date alone is a string of digits nobody checks; "Today" or "in 31 days"
 * beside it is what the user actually reads, and it is only offered forwards —
 * the first-payment field is an anchor and is usually in the past, where a
 * countdown has nothing true to say.
 *
 * iOS opens the wheels in a MODAL over the screen rather than disclosing them
 * under the row. Inline, they land wherever the row happens to sit: tapping a
 * field near the bottom of a form opened a picker below the fold, so the tap
 * appeared to do nothing at all. A modal cannot be off-screen, and it works the
 * same from a form, a sheet, or a scroll position halfway down either.
 *
 * Android has no inline form and no need for one — it opens the system dialog
 * and dismisses itself.
 *
 * It lives in shared/ui because four surfaces need it — the form's two dates,
 * manage-pricing, pause and renew — and a widget importing another widget's
 * internals is an upward import.
 */
export function NativeDateField({
  label,
  value,
  onChange,
  error,
  minimumDate,
  maximumDate,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
  minimumDate?: Date;
  /**
   * Renew uses this to make "not in the future" unreachable rather than
   * rejectable — the OS greys the days out, so there is no error to write.
   */
  maximumDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const day = toIsoDay(value);
  const days = daysUntil(day);

  const field = (
    <ValueField
      label={label}
      value={formatShortDate(day)}
      hint={days >= 0 ? formatCountdown(days) : undefined}
      error={error}
      onPress={() => setOpen(true)}
    />
  );

  if (Platform.OS !== "ios") {
    return (
      <>
        {field}
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
    <>
      {field}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        // The hardware back button on Android, and the only reason this is not
        // dead code there: the branch above returns before ever rendering it.
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel={m.common_done()}
          onPress={() => setOpen(false)}
        />
        <View style={[styles.panel, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.head}>
            <Text
              style={styles.title}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {label}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              hitSlop={12}
            >
              <Text style={styles.done}>{m.common_done()}</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value}
            mode="date"
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant="dark"
            style={styles.picker}
            onValueChange={(_event, date) => onChange(date)}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  panel: {
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.text },
  done: { fontSize: 16, fontWeight: "700", color: colors.accent },
  // UIDatePicker's wheels report no intrinsic height to Yoga; without one the
  // control lays out to zero and never appears. 216 is the control's own: at
  // anything shorter it keeps centring its selection on the height it wanted.
  picker: { height: 216 },
});
