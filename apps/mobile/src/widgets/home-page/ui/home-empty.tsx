import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { colors } from "@/shared/ui/theme";

/**
 * What Home shows before there is anything to total.
 *
 * The zero hero, a flat trend and an empty category card were technically
 * correct and told a new user nothing — and the only way to add a subscription
 * was a small "+" in the *other* tab's header. This is the route to it.
 *
 * ponytail: no tour, no carousel, no sample data. A title and the button — the
 * screen it describes is one tap away and explains itself better than prose.
 */
export function HomeEmpty() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.mark}>
        <SymbolView
          name={{ ios: "rectangle.stack", android: "stacks" }}
          size={30}
          tintColor={colors.accent}
          weight="regular"
        />
      </View>
      <Text style={styles.title}>{m.home_emptyTitle()}</Text>
      <View style={styles.action}>
        <Button
          label={m.subs_add()}
          onPress={() => router.push("/subscriptions/form")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  mark: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    maxWidth: 280,
    fontSize: 21,
    fontWeight: "700",
    textAlign: "center",
    color: colors.text,
  },
  action: { alignSelf: "stretch", paddingHorizontal: 24 },
});
