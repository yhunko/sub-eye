import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";
import { useLargeText } from "./use-large-text";

/**
 * A group of mutually exclusive choices as pills.
 *
 * `columns` wraps them into a grid instead of one row. The four period labels
 * do not survive four-across in Ukrainian — "тиждень" clipped to "тиж…" — and
 * two-across gives every label half the width to spell itself in.
 */
export function Pills<T extends string>({
  options,
  value,
  label,
  onChange,
  columns,
}: {
  options: readonly T[];
  value: T;
  label: (option: T) => string;
  onChange: (option: T) => void;
  columns?: number;
}) {
  // A capsule is a shape for one line of text. At the accessibility sizes the
  // label wraps and 999 turns the pill into a circle whose arc crops the last
  // letter — and the grid collapses to one per row, because half a phone is not
  // enough for "щомісяця" at 53pt without breaking it mid-word.
  const large = useLargeText();

  return (
    <View style={styles.group}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            style={[
              styles.pill,
              // flexBasis + grow rather than a width percentage: the group's
              // gap is not subtractable in RN, so two 50% pills overflow.
              columns
                ? {
                    flexGrow: 1,
                    flexBasis: large ? "100%" : `${80 / columns}%`,
                  }
                : null,
              large && styles.pillLarge,
              selected && styles.selected,
            ]}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {label(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pillLarge: { borderRadius: 16 },
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  // Centred because the label wraps: at the accessibility text sizes "щомісяця"
  // is two lines inside its pill, and left-ragged in a centred capsule reads as
  // a layout bug.
  label: { fontSize: 15, color: colors.muted, textAlign: "center" },
  labelSelected: { fontWeight: "600", color: colors.accent },
});
