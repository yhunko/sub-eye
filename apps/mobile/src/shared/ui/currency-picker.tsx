import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text } from "react-native";
import { m } from "@/shared/i18n";
import { CURRENCY_CODES, currencyLabel } from "@/shared/lib/format";
import { presentChoice } from "./present-choice";
import { colors } from "./theme";

/**
 * The five supported currencies, chosen from the OS's own sheet — the same
 * `presentChoice` the Settings currency row uses, so both surfaces read from one
 * list and neither ships a scroll wheel or a bundled picker library.
 *
 * It replaces a free TextField, which let autocorrect turn "usd" into "used" and
 * accepted any three letters the money formatter cannot render.
 *
 * Deliberately NOT wrapped in a `Field`: it sits inside the price input as a
 * trailing accessory, the way a native amount field carries its unit, so the two
 * share one label and one row.
 */
export function CurrencyPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (currencyCode: string) => void;
}) {
  const label = m.form_currency();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${currencyLabel(value)}`}
      onPress={() =>
        presentChoice(
          label,
          currencyLabel(value),
          CURRENCY_CODES.map((code) => ({
            label: currencyLabel(code),
            onPress: () => onChange(code),
          })),
        )
      }
      style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
    >
      <Text style={styles.value}>{currencyLabel(value)}</Text>
      <SymbolView
        name={{ ios: "chevron.up.chevron.down", android: "unfold_more" }}
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
  pressed: { backgroundColor: colors.surfaceAlt },
  value: { fontSize: 16, color: colors.text },
});
