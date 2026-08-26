import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

/**
 * What a gated surface shows instead of the feature: a card that says what is
 * behind it and opens the paywall.
 *
 * Deliberately not a hidden section and not a disabled control. A feature that
 * half-exists reads as a bug, and a dead switch reads as a broken one — the
 * whole card is the deep link.
 */
export function ProLock({ title, body }: { title: string; body?: string }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${m.paywall_unlock()}`}
      onPress={() => router.push("/paywall")}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <SymbolView
        name={{ ios: "lock.fill", android: "lock" }}
        size={17}
        tintColor={colors.accent}
        style={styles.icon}
      />
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  icon: { marginTop: 1 },
  text: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  body: { fontSize: 13, lineHeight: 18, color: colors.muted },
});
