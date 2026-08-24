import { CATEGORY_EMOJI_GROUPS } from "@subeye/model";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/ui/theme";

const COLUMNS = 6;

/**
 * Explicit rows instead of `flexWrap`. Every group holds twelve emojis, and a
 * wrapping row measured to seven-then-five at iPhone widths — a ragged second
 * row that reads as a layout bug rather than a grid. Six columns divides evenly
 * and is stable at any width.
 *
 * The `null` padding keeps a short final row's tiles the same size as a full
 * one's; without it `flex: 1` would stretch two survivors across the screen.
 */
function toRows(emojis: readonly string[]): (string | null)[][] {
  const rows: (string | null)[][] = [];
  for (let index = 0; index < emojis.length; index += COLUMNS) {
    const row: (string | null)[] = [...emojis.slice(index, index + COLUMNS)];
    while (row.length < COLUMNS) row.push(null);
    rows.push(row);
  }
  return rows;
}

/**
 * The category emoji picker, built from the server's own allow-list.
 *
 * `categoryEmojiSchema` validates against exactly these, so an emoji invented
 * client-side is a 422 the user cannot act on — which is why the groups are
 * exported from @subeye/model rather than restated here.
 *
 * ponytail: one vertical scroll, not a tabbed group selector. 120 tiles is a
 * page, not a dataset — no virtualisation, no selected-group state, and the
 * whole set stays scannable in one gesture.
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
          {toRows(group.emojis).map((row, rowIndex) => (
            // Row position is the identity here — the rows are a fixed slicing
            // of a constant array, so the index cannot go stale.
            // biome-ignore lint/suspicious/noArrayIndexKey: static grid
            <View key={rowIndex} style={styles.row}>
              {row.map((emoji, cellIndex) =>
                emoji === null ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static grid
                  <View key={`pad-${cellIndex}`} style={styles.tile} />
                ) : (
                  <Pressable
                    key={emoji}
                    accessibilityRole="button"
                    accessibilityState={{ selected: emoji === value }}
                    accessibilityLabel={emoji}
                    onPress={() => onChange(emoji)}
                    style={({ pressed }) => [
                      styles.tile,
                      styles.tileFilled,
                      emoji === value && styles.tileSelected,
                      pressed && styles.tilePressed,
                    ]}
                  >
                    {/* Uncapped Dynamic Type would break the fixed tile grid,
                        and an emoji carries no reading burden. */}
                    <Text style={styles.emoji} maxFontSizeMultiplier={1}>
                      {emoji}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  groups: { gap: 14 },
  group: { gap: 8 },
  groupLabel: { fontSize: 13, opacity: 0.6 },
  row: { flexDirection: "row", gap: 8 },
  // flex + aspectRatio, not a fixed width: six square tiles divide whatever the
  // sheet is wide, so this holds on every screen size without measuring one.
  tile: { flex: 1, aspectRatio: 1, borderRadius: 12 },
  tileFilled: {
    alignItems: "center",
    justifyContent: "center",
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
