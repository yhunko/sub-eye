import type { ReactNode } from "react";
import { useState } from "react";
import type { TextInputProps } from "react-native";
import { StyleSheet, TextInput, View } from "react-native";
import { Field } from "@/shared/ui/field";
import { colors } from "@/shared/ui/theme";

/**
 * The auth screens' text control: 52pt tall with a focus border, versus the
 * 44pt one in `shared/ui/field`'s TextField that the two form sheets use. Kept
 * separate rather than adding a size prop there — those sheets are shipped and
 * device-verified, and this needs a trailing slot they never do.
 */
export function AuthInput({
  label,
  accessory,
  hint,
  error,
  trailing,
  ...input
}: {
  label: string;
  /** Trailing element on the LABEL row ("Forgot?", "Optional"). */
  accessory?: ReactNode;
  hint?: string;
  error?: string;
  /** Trailing element INSIDE the control (the password eye). */
  trailing?: ReactNode;
} & TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Field
      label={label}
      accessory={accessory}
      hint={hint}
      error={error}
      gap={0}
    >
      <View
        style={[
          styles.control,
          focused ? styles.focused : null,
          error ? styles.errored : null,
        ]}
      >
        <TextInput
          {...input}
          style={styles.input}
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          onFocus={(event) => {
            setFocused(true);
            input.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            input.onBlur?.(event);
          }}
          // The app is dark-only, so the OS keyboard has to be told as well — it
          // defaults to the light one and flashes white over a near-black screen.
          keyboardAppearance="dark"
        />
        {trailing}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  control: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  // #33a453 is 5.92:1 — enough for a filled button, too dim for a 1px border.
  focused: { borderColor: colors.accentBright },
  errored: { borderColor: colors.danger },
  input: { flex: 1, height: "100%", fontSize: 16, color: colors.text },
});
