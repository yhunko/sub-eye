import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

/**
 * "Change the brand", as a circle on the brand card.
 *
 * iOS has `brand-edit-button.ios.tsx`, which is a real SwiftUI `Button` in
 * `.buttonStyle(.glass)`. **The platform suffix is load bearing**, for the same
 * reason `cadence-picker.ios.tsx` has one: `@expo/ui/swift-ui` calls
 * `requireNativeView` at MODULE SCOPE, so merely importing it on Android throws
 * before any `Platform.OS` branch could run. Metro drops a `.ios.tsx` from the
 * Android bundle entirely, which a runtime branch cannot do.
 *
 * This is what Android gets instead, and it is a look-alike, not the material:
 * a fixed translucent fill has no idea what is behind it. It sits on the same
 * brand wash, which is most of the effect.
 *
 * Fixed size at every Dynamic Type setting, and that is what let the row stop
 * stacking: the label this replaced was 53pt of "Change" at the accessibility
 * sizes, which left nothing of the brand name beside it.
 */
export function BrandEditButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={m.form_brandChange()}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <SymbolView
        name={{ ios: "pencil", android: "edit" }}
        size={18}
        tintColor={colors.text}
        weight="semibold"
      />
    </Pressable>
  );
}

// Apple's minimum touch target, and the size the iOS host is given so the two
// platforms lay the row out identically.
const SIZE = 44;

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.24)",
  },
  pressed: { opacity: 0.6 },
});
