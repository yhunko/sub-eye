import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, LAYOUT_FONT_SCALE_MAX } from "./theme";

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
              columns ? { flexGrow: 1, flexBasis: `${80 / columns}%` } : null,
              selected && styles.selected,
            ]}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text
              style={[styles.label, selected && styles.labelSelected]}
              numberOfLines={1}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
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
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  label: { fontSize: 15, color: colors.muted },
  labelSelected: { fontWeight: "600", color: colors.accent },
});
