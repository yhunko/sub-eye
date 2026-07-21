import type { ReactNode } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "./theme";

/** A labelled row with an optional inline error. Both form sheets are built from it. */
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  label: { marginBottom: 6, fontSize: 13, color: colors.muted },
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
