import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { dateLocale } from "@/shared/i18n";
import { Field } from "./field";
import { colors } from "./theme";

/**
 * The OS date picker.
 *
 * iOS renders it inline and compact; Android has no inline form, so it opens the
 * system dialog on tap and dismisses itself. It lives in shared/ui because all
 * three sheets need it — add/edit, manage-pricing and pause — and a widget
 * importing another widget's internals is an upward import.
 *
 * This replaces the retired web client's 317-line, four-file custom picker,
 * which only existed because <input type="date"> is poor.
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
  const [androidOpen, setAndroidOpen] = useState(false);

  if (Platform.OS === "ios") {
    return (
      <Field label={label} error={error}>
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          themeVariant="dark"
          onValueChange={(_event, date) => onChange(date)}
        />
      </Field>
    );
  }

  return (
    <Field label={label} error={error}>
      <Pressable
        style={styles.trigger}
        onPress={() => setAndroidOpen(true)}
        accessibilityRole="button"
      >
        <Text style={styles.value}>
          {value.toLocaleDateString(dateLocale())}
        </Text>
      </Pressable>
      {androidOpen ? (
        <DateTimePicker
          value={value}
          mode="date"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          // Both handlers unmount the dialog, because only `onValueChange`
          // fires on a pick. Without `onDismiss` a cancelled dialog leaves
          // `androidOpen` true, and the field cannot be opened a second time.
          onValueChange={(_event, date) => {
            setAndroidOpen(false);
            onChange(date);
          }}
          onDismiss={() => setAndroidOpen(false)}
        />
      ) : null}
    </Field>
  );
}

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  value: { fontSize: 16, color: colors.text },
});
