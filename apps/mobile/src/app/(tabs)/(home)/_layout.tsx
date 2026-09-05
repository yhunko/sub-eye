import { Stack, useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { dateLocale, m } from "@/shared/i18n";
import {
  androidTransparentHeader,
  nativeHeaderChrome,
} from "@/shared/ui/header";
import { HeaderButton } from "@/shared/ui/header-button";
import { colors } from "@/shared/ui/theme";
import { useShrinkFloor } from "@/shared/ui/use-large-text";

/** The month's design size in the bar, and the size it may never shrink past. */
const MONTH_SIZE = 24;
/** UIKit's own nav-bar title size — the floor is "no smaller than standard". */
const MONTH_FLOOR = 17;

/**
 * The month, as a LEADING header item rather than the bar's `title`.
 *
 * `headerLargeTitle` was the first answer and it is the wrong shape here: UIKit
 * draws a large title on its own row BELOW the bar, so the month and the `+`
 * could never share a line — which is how Mail and Notes look, and not how this
 * screen is meant to. A leading item is the nav bar's own left slot, so the two
 * sit on one line with the platform's insets and the platform's glass.
 *
 * `hidesSharedBackground` on the item is what stops iOS 26 drawing it as a
 * BUTTON: a bar item takes the liquid-glass capsule by default, and a month name
 * inside a capsule reads as a control that does nothing when tapped.
 *
 * It shrinks rather than being capped: a nav bar is a fixed-height native
 * container, and `adjustsFontSizeToFit` floored at UIKit's own 17pt means the
 * accessibility text sizes get a month name that is never smaller than a
 * standard title and never clipped. A `maxFontSizeMultiplier` here would be the
 * cap this app does not do.
 */
/**
 * Ukrainian writes its month names in lower case — `Intl` correctly returns
 * "вересень" — but this one is a heading, and a heading is capitalised in both
 * languages. Without it the app opened on a title that read like a typo.
 *
 * Locale-aware, because upper-casing the first letter is not the same operation
 * in every language, and this string comes straight from `Intl`.
 */
const capitalise = (text: string) =>
  text.charAt(0).toLocaleUpperCase(dateLocale()) + text.slice(1);

function MonthTitle() {
  return (
    <Text
      style={styles.month}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={useShrinkFloor(MONTH_SIZE, MONTH_FLOOR)}
      accessibilityRole="header"
    >
      {capitalise(
        new Intl.DateTimeFormat(dateLocale(), { month: "long" }).format(
          new Date(),
        ),
      )}
    </Text>
  );
}

// This screen went headerless first, on the argument that a bar repeating the
// tab's own word costs the hero its place above the fold. That still holds — but
// `scrollEdgeEffects` only blurs content passing under HEADER ITEMS, so with no
// header the first card slid up into a bare status bar with nothing behind it.
//
// So the bar is back carrying two things that are not "Home": the month every
// figure below is scoped to (the hero says "remaining this month" and never
// names which), and the same `+` bar button the subscriptions list has — adding
// a subscription from the screen the app opens on should not cost a tab switch.
//
// `headerTitle: ""` is load-bearing: a `title` and a leading item both render,
// which would put the month in the bar twice.
//
// It lives here rather than in HomePage so the loading, error and first-run
// states get the same chrome; each of those is an early return.
export default function HomeTabLayout() {
  const router = useRouter();
  const openForm = () => router.push("/subscription-form");

  return (
    <Stack
      screenOptions={{
        ...nativeHeaderChrome,
        ...androidTransparentHeader,
        // ponytail: resolved once per mount, so a month rollover with the app
        // in the foreground shows the old name until it remounts. Move it into
        // HomePage's own <Stack.Screen> if that ever matters.
        headerTitle: "",
        // Native UIBarButtonItems on iOS; expo-router only swaps these in
        // there, so the two JS renderers below stay as the Android path —
        // where there is no shared glass to hide in the first place.
        unstable_headerLeftItems: () => [
          {
            type: "custom" as const,
            element: <MonthTitle />,
            hidesSharedBackground: true,
          },
        ],
        headerLeft: () => <MonthTitle />,
        unstable_headerRightItems: () => [
          {
            type: "button" as const,
            label: m.subs_add(),
            icon: { type: "sfSymbol" as const, name: "plus" as const },
            variant: "prominent" as const,
            tintColor: colors.accent,
            onPress: openForm,
          },
        ],
        headerRight: () => (
          <HeaderButton
            ios="plus"
            android="add"
            label={m.subs_add()}
            onPress={openForm}
            tintColor={colors.accent}
          />
        ),
      }}
    />
  );
}

const styles = StyleSheet.create({
  month: {
    fontSize: MONTH_SIZE,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.text,
  },
});
