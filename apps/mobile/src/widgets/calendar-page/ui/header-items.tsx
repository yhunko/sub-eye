import { SymbolView } from "expo-symbols";
import { Pressable } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

/**
 * The calendar's options button. Declared on the LAYOUT, not the screen: it
 * depends on nothing the page holds, and options set from inside a screen are
 * re-pushed through `navigation.setOptions` on every render.
 *
 * expo-router only swaps native bar items in on iOS, so the Pressable stays as
 * the Android path.
 */
export function calendarOptionsHeaderOptions(onPress: () => void) {
  return {
    unstable_headerRightItems: () => [
      {
        type: "button" as const,
        label: m.calendar_options(),
        icon: {
          type: "sfSymbol" as const,
          name: "slider.horizontal.3" as const,
        },
        tintColor: colors.accent,
        onPress,
      },
    ],
    headerRight: () => (
      <Pressable
        onPress={onPress}
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
    ),
  };
}
