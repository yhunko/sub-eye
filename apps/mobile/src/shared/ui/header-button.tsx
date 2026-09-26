import type { AndroidSymbol, SFSymbol, SymbolWeight } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import { Platform, Pressable, StyleSheet } from "react-native";
import { colors } from "./theme";

/**
 * An icon in a native header's left or right slot.
 *
 * iOS barely uses this path — a screen that wants a bar item declares a real
 * `UIBarButtonItem` through `unstable_headerLeftItems`, and expo-router only
 * swaps those in there. This is the ANDROID path, and it existed as a bare
 * `<Pressable>` around a `<SymbolView>` on seven screens, which is what made
 * every one of them look wrong: react-native-screens drops the element into the
 * native `Toolbar` as-is, and a view with no width sits flush against the title.
 * The form's close button and "New subscription" were touching.
 *
 * A Material toolbar's own navigation icon is a 48dp square with the glyph
 * centred in it, and the title starts after that square rather than after the
 * glyph — so giving this button the same box is what buys back BOTH the touch
 * target and the keyline. `hitSlop` could not: it grows the touch area and
 * nothing else, so the layout stayed wrong while the tap got easier.
 *
 * The glyph is 24dp on Android whatever the caller asked for — Material's own
 * toolbar icon size, and the reason the close button read as a hairline `x`
 * beside a 20pt title. `size` stays the iOS number, where a bar item is smaller
 * and the two screens that render this path on iOS are tuned to it.
 */
export function HeaderButton({
  ios,
  android,
  label,
  onPress,
  tintColor = colors.text,
  size = 22,
  weight,
  selected,
}: {
  ios: SFSymbol;
  android: AndroidSymbol;
  label: string;
  onPress: () => void;
  tintColor?: string;
  size?: number;
  weight?: SymbolWeight;
  /** Announced to a screen reader for a toggle-ish item (the list's filters). */
  selected?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      android_ripple={ANDROID_RIPPLE}
      // iOS keeps the slop rather than the box: a bar item there is laid out by
      // UIKit, and a 48pt view in the slot pushes the title off centre.
      hitSlop={Platform.OS === "ios" ? 12 : undefined}
      style={({ pressed }) => [
        styles.button,
        pressed && Platform.OS === "ios" && styles.pressed,
      ]}
    >
      <SymbolView
        name={{ ios, android }}
        size={Platform.OS === "android" ? ANDROID_ICON_SIZE : size}
        tintColor={tintColor}
        weight={weight}
      />
    </Pressable>
  );
}

/** Material's toolbar glyph. The 48dp box around it is the touch target. */
const ANDROID_ICON_SIZE = 24;

// Borderless, which is the toolbar icon's own ripple — a bounded one would draw
// a square behind a round glyph.
const ANDROID_RIPPLE = {
  borderless: true,
  radius: 24,
  color: "rgba(255,255,255,0.12)",
};

const styles = StyleSheet.create({
  button: Platform.select({
    android: {
      // The box is flush to the toolbar's content edge, so the glyph's centre
      // lands 24dp in — where a Material navigation icon sits — and the title
      // starts after the box rather than against the glyph.
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    default: {},
  }),
  pressed: { opacity: 0.6 },
});
