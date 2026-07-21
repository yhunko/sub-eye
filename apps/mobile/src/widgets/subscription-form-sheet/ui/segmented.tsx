import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

/** A row of mutually exclusive choices. Used for period, offer kind and mode. */
export function Segmented<T extends string>({
  options,
  value,
  label,
  onChange,
}: {
  options: readonly T[];
  value: T;
  label: (option: T) => string;
  onChange: (option: T) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            style={[styles.segment, selected && styles.selected]}
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
  row: { flexDirection: "row", gap: 8 },
  segment: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  label: { fontSize: 13, color: colors.muted },
  labelSelected: { fontWeight: "700", color: colors.bg },
});
