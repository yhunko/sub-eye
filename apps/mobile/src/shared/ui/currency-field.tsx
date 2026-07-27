import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text } from "react-native";
import { m } from "@/shared/i18n";
import { CURRENCY_CODES, currencyLabel } from "@/shared/lib/format";
import { Field } from "./field";
import { presentChoice } from "./present-choice";
import { colors } from "./theme";

/**
 * The five supported currencies, chosen from the OS's own sheet — the same
 * `presentChoice` the Settings currency row uses, so both surfaces read from one
 * list and neither ships a scroll wheel or a bundled picker library.
 *
 * It replaces a free TextField, which let autocorrect turn "usd" into "used" and
 * accepted any three letters the money formatter cannot render.
 */
export function CurrencyField({
  value,
  onChange,
}: {
  value: string;
  onChange: (currencyCode: string) => void;
}) {
  const label = m.form_currency();

  return (
    <Field label={label}>
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
    </Field>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  value: { flex: 1, fontSize: 16, color: colors.text },
});
