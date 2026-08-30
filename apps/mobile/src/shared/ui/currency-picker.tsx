import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text } from "react-native";
import { m } from "@/shared/i18n";
import { currencyLabel } from "@/shared/lib/format";
import { colors } from "./theme";
import { useLargeText } from "./use-large-text";

/**
 * The price field's currency, as a trailing accessory rather than a second
 * labelled row — the way a native amount field carries its unit, so the two
 * share one label and one row. Deliberately NOT wrapped in a `Field`.
 *
 * It only opens the picker; `onPress` is passed in because a screen owns where
 * that goes, and `shared/` must not know a route. What it opens used to be an
 * `ActionSheetIOS` over five hard-coded codes — see `widgets/currency-page`.
 *
 * It replaces a free TextField, which let autocorrect turn "usd" into "used"
 * and accepted any three letters the money formatter cannot render.
 */
export function CurrencyPicker({
  value,
  onPress,
}: {
  value: string;
  onPress: () => void;
}) {
  // The price box turns into a column at the accessibility sizes, so the edge
  // that separates the two controls has to turn with it.
  const stacked = useLargeText();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${m.form_currency()}, ${currencyLabel(value)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.trigger,
        stacked && styles.triggerStacked,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.value}>{currencyLabel(value)}</Text>
      <SymbolView
        name={{ ios: "chevron.right", android: "chevron_right" }}
        size={13}
        tintColor={colors.muted}
        weight="semibold"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "stretch",
    paddingHorizontal: 12,
    // Its own left edge, so the accessory reads as a second control rather than
    // as text that happens to sit at the end of the amount.
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  triggerStacked: {
    borderLeftWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 12,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  value: { fontSize: 16, color: colors.text },
});
