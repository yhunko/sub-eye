import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text } from "react-native";
import { m } from "@/shared/i18n";
import { currencyLabel } from "@/shared/lib/format";
import { colors } from "./theme";

/**
 * The price row's currency, as a trailing accessory rather than a second
 * labelled row — the way a native amount field carries its unit, so the two
 * share one label and one line. Deliberately NOT wrapped in a `Field`.
 *
 * It wears UIKit's up/down pair rather than a chevron: this is a pop-up button,
 * not a push. It only opens the picker; `onPress` is passed in because a screen
 * owns where that goes, and `shared/` must not know a route. What it opens used
 * to be an `ActionSheetIOS` over five hard-coded codes — see
 * `widgets/currency-page`.
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${m.form_currency()}, ${currencyLabel(value)}`}
      onPress={onPress}
      // Asymmetric, and the left edge is the point: a uniform slop reached 8pt
      // back over the amount's right-hand digits, so tapping the number opened
      // the currency picker instead of the keyboard.
      hitSlop={{ top: 10, bottom: 10, right: 10, left: 0 }}
      style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
    >
      <Text style={styles.value}>{currencyLabel(value)}</Text>
      <SymbolView
        name={{ ios: "chevron.up.chevron.down", android: "unfold_more" }}
        size={12}
        tintColor={colors.muted}
        weight="semibold"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    // NO trailing padding: the row's own 16 is what puts a value on the card's
    // right-hand column, and a control that adds its own sits that many points
    // short of every neighbour. `hitSlop` buys the touch target back instead.
    paddingLeft: 8,
    paddingVertical: 4,
    borderRadius: 8,
    // MARGIN, not padding: it separates this control from the field beside it
    // without handing the gap to this control's touch area, which is the whole
    // reason the amount was hard to hit.
    marginLeft: 8,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  // Primary, not muted: this row CHANGES a value where it stands, and iOS
  // reserves the secondary colour for a detail you are only being shown. The
  // category row beside it is muted for exactly that reason.
  value: { flexShrink: 1, fontSize: 16, color: colors.text },
});
