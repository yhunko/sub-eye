import { SymbolView } from "expo-symbols";
import { Pressable } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

/**
 * The `+` that opens the create sheet, as screen options.
 *
 * Both category screens carry it and neither of them owns it: it is declared on
 * the LAYOUT of each, so it is part of the screen's initial descriptor instead
 * of being re-pushed through `navigation.setOptions` on every render. That is
 * also why it takes a plain `onPress` — the two screens create into different
 * stacks, and the target is the only thing that differs between them.
 */
export function categoryAddHeaderOptions(onPress: () => void) {
  return {
    // A real UIBarButtonItem — iOS 26 gives it its own glass capsule.
    // expo-router only swaps these in on iOS, so the Pressable stays as the
    // Android path.
    unstable_headerRightItems: () => [
      {
        type: "button" as const,
        label: m.category_add(),
        icon: { type: "sfSymbol" as const, name: "plus" as const },
        variant: "prominent" as const,
        tintColor: colors.accent,
        onPress,
      },
    ],
    headerRight: () => (
      <Pressable
        onPress={onPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={m.category_add()}
      >
        <SymbolView
          name={{ ios: "plus", android: "add" }}
          size={22}
          tintColor={colors.accent}
        />
      </Pressable>
    ),
  };
}
