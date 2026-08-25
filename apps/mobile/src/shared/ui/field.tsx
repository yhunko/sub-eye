import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Chevron } from "./choice-row";
import { colors, LAYOUT_FONT_SCALE_MAX } from "./theme";

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
  autoFocus,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  keyboardType?: "default" | "decimal-pad" | "number-pad" | "url";
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words";
  autoFocus?: boolean;
  /** Given, the keyboard's return key submits — the field is the whole form. */
  onSubmitEditing?: () => void;
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
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={onSubmitEditing ? "done" : undefined}
        // The app is dark-only, so the OS keyboard has to be told as well —
        // it defaults to the light one and flashes white over a near-black sheet.
        keyboardAppearance="dark"
      />
    </Field>
  );
}

/**
 * A labelled row that DISPLAYS a value and goes somewhere to change it — the
 * category picker, a date, the pricing sheet.
 *
 * `hint` is the same value said another way ("Today", "in 31 days"), which is
 * what stops a row of digits from being the only thing the user has to read.
 */
export function ValueField({
  label,
  value,
  hint,
  placeholder,
  error,
  onPress,
  trailing,
}: {
  label: string;
  value?: string;
  hint?: string;
  /** Shown, muted, when there is no value. */
  placeholder?: string;
  error?: string;
  onPress?: () => void;
  /** Replaces the chevron for a row that does not push a screen. */
  trailing?: ReactNode;
}) {
  return (
    <Field label={label} error={error}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value ?? placeholder ?? ""}`}
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [
          styles.valueBox,
          error ? styles.inputError : null,
          pressed && styles.valueBoxPressed,
        ]}
      >
        <Text
          style={[styles.value, value ? null : styles.valuePlaceholder]}
          numberOfLines={1}
          maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
        >
          {value ?? placeholder}
        </Text>
        {hint ? <Text style={styles.valueHint}>{hint}</Text> : null}
        {trailing ?? (onPress ? <Chevron /> : null)}
      </Pressable>
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
  valueBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  valueBoxPressed: { backgroundColor: colors.surfaceAlt },
  value: { flex: 1, fontSize: 16, color: colors.text },
  valuePlaceholder: { color: colors.muted },
  valueHint: { fontSize: 13, color: colors.muted },
  error: { marginTop: 4, fontSize: 13, color: colors.danger },
});
