import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable } from "react-native";
import { dateLocale, m } from "@/shared/i18n";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { colors } from "@/shared/ui/theme";

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
// It lives here rather than in HomePage so the loading, error and first-run
// states get the same chrome; each of those is an early return.
export default function HomeTabLayout() {
  const router = useRouter();
  const openForm = () => router.push("/subscription-form");

  return (
    <Stack
      screenOptions={{
        ...nativeHeaderChrome,
        // ponytail: resolved once per mount, so a month rollover with the app
        // in the foreground shows the old name until it remounts. Move it into
        // HomePage's own <Stack.Screen> if that ever matters.
        title: new Intl.DateTimeFormat(dateLocale(), { month: "long" }).format(
          new Date(),
        ),
        // Native UIBarButtonItem on iOS; expo-router only swaps these in there,
        // so the Pressable below stays as the Android path.
        unstable_headerLeftItems: () => [
          {
            type: "button" as const,
            label: m.subs_add(),
            icon: { type: "sfSymbol" as const, name: "plus" as const },
            variant: "prominent" as const,
            tintColor: colors.accent,
            onPress: openForm,
          },
        ],
        headerLeft: () => (
          <Pressable
            onPress={openForm}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={m.subs_add()}
          >
            <SymbolView
              name={{ ios: "plus", android: "add" }}
              size={22}
              tintColor={colors.accent}
            />
          </Pressable>
        ),
      }}
    />
  );
}
