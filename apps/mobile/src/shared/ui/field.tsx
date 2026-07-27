import type { ReactNode } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "./theme";

/** A labelled row with an optional inline error. Both form sheets are built from it. */
export function Field({
  label,
  error,
  hint,
  accessory,
  gap,
  children,
}: {
  label: string;
  error?: string;
  /** Explanatory copy under the control — sits below the error when both show. */
  hint?: string;
  /** Trailing element on the label row ("Forgot?", "Optional"). */
  accessory?: ReactNode;
  /** Bottom spacing. The auth screens space fields with a flex gap instead. */
  gap?: number;
  children: ReactNode;
}) {
  return (
    <View
      style={[styles.field, gap === undefined ? null : { marginBottom: gap }]}
    >
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {accessory}
      </View>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  error,
  keyboardType = "default",
  placeholder,
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <Field label={label} error={error}>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        // The app is dark-only, so the OS keyboard has to be told as well —
        // it defaults to the light one and flashes white over a near-black sheet.
        keyboardAppearance="dark"
      />
    </Field>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  labelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  label: { marginBottom: 6, fontSize: 13, color: colors.muted },
  hint: { marginTop: 6, fontSize: 12.5, lineHeight: 17, color: colors.muted },
  input: {
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputError: { borderColor: colors.danger },
  error: { marginTop: 4, fontSize: 13, color: colors.danger },
});
