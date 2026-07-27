import { CATEGORY_EMOJI_GROUPS } from "@subeye/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/ui/theme";

/**
 * The category emoji picker, built from the server's own allow-list.
 *
 * `categoryEmojiSchema` validates against exactly these, so an emoji invented
 * client-side is a 422 the user cannot act on — which is why the groups are
 * exported from @subeye/shared rather than restated here.
 *
 * ponytail: one vertical scroll of wrapped rows, not a tabbed group selector.
 * 120 tiles is a page, not a dataset — no virtualisation, no selected-group
 * state, and the whole set stays scannable in one gesture.
 */
export function EmojiGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  return (
    <View style={styles.groups}>
      {CATEGORY_EMOJI_GROUPS.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          <View style={styles.row}>
            {group.emojis.map((emoji) => {
              const selected = emoji === value;
              return (
                <Pressable
                  key={emoji}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={emoji}
                  onPress={() => onChange(emoji)}
                  style={({ pressed }) => [
                    styles.tile,
                    selected && styles.tileSelected,
                    pressed && styles.tilePressed,
                  ]}
                >
                  {/* Uncapped Dynamic Type would break the fixed tile grid, and
                      an emoji carries no reading burden. */}
                  <Text style={styles.emoji} maxFontSizeMultiplier={1}>
                    {emoji}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  groups: { gap: 14 },
  group: { gap: 8 },
  groupLabel: { fontSize: 13, opacity: 0.6 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  tilePressed: { backgroundColor: colors.surfaceAlt },
  emoji: { fontSize: 22 },
});
