import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
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
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
  minimumDate?: Date;
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
          themeVariant="dark"
          onChange={(_event, date) => {
            if (date) onChange(date);
          }}
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
        <Text style={styles.value}>{value.toLocaleDateString()}</Text>
      </Pressable>
      {androidOpen ? (
        <DateTimePicker
          value={value}
          mode="date"
          minimumDate={minimumDate}
          onChange={(_event, date) => {
            // Android fires once and closes, for both "set" and "dismissed".
            setAndroidOpen(false);
            if (date) onChange(date);
          }}
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
