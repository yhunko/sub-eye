import { Pressable, StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

/**
 * A headerless sheet's own title bar.
 *
 * `nativeSheetChrome` turns the navigator's header off, and neither sheet here
 * has a commit action to put in one — a settings switch writes on tap and the
 * day breakdown is read-only, so there is nothing to save and nothing to cancel.
 * Done is still spelled out rather than left to the grabber: a drag-to-dismiss
 * is discoverable only if you already know it is there.
 *
 * Carries an OPAQUE background because both sheets pin it with
 * `stickyHeaderIndices` — a transparent sticky header lets the rows scroll
 * through the title.
 */
export function SheetHeader({
  title,
  subtitle,
  onDone,
}: {
  title: string;
  subtitle?: string;
  onDone: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        hitSlop={12}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={styles.done}>{m.common_done()}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 14,
    backgroundColor: colors.bg,
  },
  text: { flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 19, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 12.5, color: colors.muted },
  done: {
    flexShrink: 0,
    fontSize: 16,
    fontWeight: "600",
    color: colors.accent,
  },
  pressed: { opacity: 0.6 },
});
