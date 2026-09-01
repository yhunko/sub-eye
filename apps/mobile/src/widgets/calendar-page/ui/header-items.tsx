import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

/**
 * The calendar's two bar buttons: the year view, and how the month draws itself.
 *
 * Declared on the LAYOUT, not the screen: they depend on nothing the page holds,
 * and options set from inside a screen are re-pushed through
 * `navigation.setOptions` on every render.
 *
 * Both on the RIGHT rather than one either side. The left slot belongs to the
 * back button on every other screen in this stack, and a control that appears
 * only where there is nothing to go back to is a control in a different place
 * each time.
 *
 * expo-router only swaps native bar items in on iOS, so the Pressables stay as
 * the Android path.
 */
export function calendarHeaderOptions({
  onYear,
  onOptions,
}: {
  onYear: () => void;
  onOptions: () => void;
}) {
  return {
    unstable_headerRightItems: () => [
      {
        type: "button" as const,
        label: m.calendar_year(),
        icon: { type: "sfSymbol" as const, name: "square.grid.3x3" as const },
        tintColor: colors.accent,
        onPress: onYear,
      },
      {
        type: "button" as const,
        label: m.calendar_options(),
        icon: {
          type: "sfSymbol" as const,
          name: "slider.horizontal.3" as const,
        },
        tintColor: colors.accent,
        onPress: onOptions,
      },
    ],
    headerRight: () => (
      <View style={styles.items}>
        <Pressable
          onPress={onYear}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={m.calendar_year()}
        >
          <SymbolView
            name={{ ios: "square.grid.3x3", android: "grid_view" }}
            size={22}
            tintColor={colors.accent}
          />
        </Pressable>
        <Pressable
          onPress={onOptions}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={m.calendar_options()}
        >
          <SymbolView
            name={{ ios: "slider.horizontal.3", android: "tune" }}
            size={22}
            tintColor={colors.accent}
          />
        </Pressable>
      </View>
    ),
  };
}

/**
 * A sheet's close button, as a real bar item.
 *
 * The two calendar sheets keep a navigation bar (`categorySheetChrome`) for
 * this one control. A hand-drawn disc in the corner of the content is the
 * alternative, and it can only ever be a flat imitation: iOS 26 renders a
 * `UIBarButtonItem` in Liquid Glass, and nothing in JS reproduces a material
 * that samples what is behind it. It also puts dismissal where the platform
 * puts it, and hands VoiceOver a real bar button.
 *
 * A glyph rather than the word "Done": these sheets have nothing to commit —
 * one writes on tap, the other is read-only — so a word in the corner would
 * announce a decision that was never asked for.
 */
export function sheetCloseHeaderOptions(onPress: () => void) {
  return {
    unstable_headerRightItems: () => [
      {
        type: "button" as const,
        label: m.common_done(),
        icon: { type: "sfSymbol" as const, name: "xmark" as const },
        tintColor: colors.text,
        onPress,
      },
    ],
    headerRight: () => (
      <Pressable
        onPress={onPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={m.common_done()}
      >
        <SymbolView
          name={{ ios: "xmark", android: "close" }}
          size={20}
          tintColor={colors.text}
          weight="semibold"
        />
      </Pressable>
    ),
  };
}

const styles = StyleSheet.create({
  items: { flexDirection: "row", alignItems: "center", gap: 18 },
});
