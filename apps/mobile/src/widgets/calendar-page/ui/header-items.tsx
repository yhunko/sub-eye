import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

/**
 * The month, as the leading item of the navigation bar.
 *
 * NOT the screen `title`. UIKit centres a title, so one whose width changes with
 * the month — "May 2026" against "September 2026" — sits somewhere different
 * every time the pager lands, and the eye tracks the movement instead of the
 * word. `headerTitleAlign` is not a way out: native-stack documents it as iOS
 * no-op, always centred. The bar's LEFT slot is the one place where the label's
 * own width changes nothing.
 *
 * `hidesSharedBackground` because iOS 26 draws bar items as glass capsules and
 * this one is a title, not a button. `headerLeft` is the Android path, where
 * expo-router does not swap native bar items in — same split as the buttons
 * below.
 *
 * Taken from the SCREEN rather than the layout, unlike everything else here: it
 * is the one piece of chrome that depends on which month is showing.
 */
export function monthTitleOptions(label: string) {
  const title = (
    <Text style={styles.monthTitle} numberOfLines={1}>
      {label}
    </Text>
  );
  return {
    // Emptied, not left unset: `getHeaderTitle` falls back to the route name,
    // and a bar reading "index" is worse than the jump this replaces.
    headerTitle: "",
    unstable_headerLeftItems: () => [
      { type: "custom" as const, element: title, hidesSharedBackground: true },
    ],
    headerLeft: () => title,
  };
}

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
  // A UIKit navigation-bar title, restated: the bar draws nothing of its own
  // into a custom item.
  monthTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
});
