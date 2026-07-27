import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, LAYOUT_FONT_SCALE_MAX } from "./theme";

type Variant = "primary" | "secondary" | "plain";

/**
 * The app's only button. Three variants, no size prop — the design uses one
 * height per variant.
 *
 * A filled green button takes DARK ink: #0f1115 on #33a453 is 5.92:1 (AA),
 * white on the same green is 3.19:1 and fails.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  busy = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
}) {
  const inactive = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !inactive ? pressedStyles[variant] : null,
        inactive ? disabledStyles[variant] : null,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={variant === "primary" ? colors.bg : colors.text}
        />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            style={[
              styles.label,
              variant === "primary" ? styles.labelPrimary : styles.labelOther,
              variant === "plain" ? styles.labelPlain : null,
              inactive && variant === "primary" ? styles.labelDim : null,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  content: { flexDirection: "row", alignItems: "center", gap: 9 },
  primary: { height: 52, backgroundColor: colors.accent },
  secondary: {
    height: 50,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  plain: { height: 40, paddingHorizontal: 16 },
  label: { fontSize: 16, fontWeight: "700" },
  labelPrimary: { color: colors.bg },
  labelOther: { color: colors.text, fontSize: 15 },
  labelPlain: { color: colors.muted, fontWeight: "600" },
  labelDim: { opacity: 0.55 },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accentPressed },
  secondary: { backgroundColor: colors.surfaceAlt },
  plain: { opacity: 0.6 },
});

const disabledStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accentDisabled },
  secondary: { opacity: 0.4 },
  plain: { opacity: 0.4 },
});
