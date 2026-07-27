import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { useState } from "react";
import type { TextInputProps } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";
import { passwordStrength } from "../model/password-strength";
import { AuthInput } from "./auth-input";

const STRENGTH_LABEL = [
  null,
  m.auth_strengthWeak,
  m.auth_strengthGood,
  m.auth_strengthStrong,
];

export function PasswordInput({
  label,
  accessory,
  error,
  meter = false,
  value,
  ...input
}: {
  label: string;
  accessory?: ReactNode;
  error?: string;
  /** Show the strength meter — sign-up and reset only, never sign-in. */
  meter?: boolean;
  value: string;
} & TextInputProps) {
  const [visible, setVisible] = useState(false);
  const score = passwordStrength(value);

  return (
    <View>
      <AuthInput
        {...input}
        label={label}
        accessory={accessory}
        error={error}
        value={value}
        secureTextEntry={!visible}
        autoCapitalize="none"
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              visible ? m.auth_hidePassword() : m.auth_showPassword()
            }
            // The control is 52pt tall but the icon is 20 — hitSlop is what
            // makes this a 44pt target rather than a 20pt one.
            hitSlop={12}
            onPress={() => setVisible((current) => !current)}
          >
            <SymbolView
              name={
                visible
                  ? { ios: "eye.slash", android: "visibility_off" }
                  : { ios: "eye", android: "visibility" }
              }
              size={20}
              tintColor={colors.muted}
            />
          </Pressable>
        }
      />
      {meter && score > 0 ? (
        <View style={styles.meter}>
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={[styles.segment, step <= score ? styles.segmentOn : null]}
            />
          ))}
          <Text style={styles.strength}>{STRENGTH_LABEL[score]?.()}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
  },
  segmentOn: { backgroundColor: colors.accent },
  strength: { fontSize: 12.5, color: colors.muted },
});
