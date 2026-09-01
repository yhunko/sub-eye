import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { PromptSheet } from "@/shared/ui/prompt-sheet";
import { colors } from "@/shared/ui/theme";

/**
 * The one time the app brings up Pro on its own.
 *
 * A sheet rather than an `Alert`, which is what this was first. A system alert
 * is the right register for a short yes/no — it is the wrong one for a pitch,
 * because everything it has to say has to be said in prose, and four features
 * described in a sentence is a paragraph nobody reads inside a dialog box. The
 * same four as a list is one glance.
 *
 * And a sheet sized to its CONTENTS rather than a full-screen modal, which it
 * also was briefly. A whole card for six short lines is a lot of screen taken
 * from someone who did not ask for any of it; a fitted sheet asks for exactly
 * as much room as it needs and leaves Home visible behind it, which is the
 * difference between an offer and an interception. `PromptSheet` is that shell,
 * shared with the reminders offer.
 *
 * It is deliberately NOT the paywall. The paywall answers "what is Pro" at full
 * length to someone who went looking; this answers "why am I being shown this"
 * to someone who did not.
 *
 * The bullets are the feature rail's own labels, in the rail's own order, so
 * the two cannot drift into advertising different products.
 */
const BULLETS = [
  { key: "reminders", label: m.paywall_featureReminders },
  { key: "calendar", label: m.paywall_featureCalendar },
  { key: "pricing", label: m.paywall_featurePricing },
  { key: "categories", label: m.paywall_featureCategories },
];

export function ProPitchPage() {
  const router = useRouter();

  return (
    <PromptSheet
      icon={{ ios: "sparkles", android: "auto_awesome" }}
      title={m.prompt_proTitle()}
      body={m.prompt_proBody()}
      actions={
        <>
          {/* `replace`, not push-on-top: backing out of the paywall should
              land on Home, not on the sheet that sent them there. */}
          <Button
            label={m.prompt_proConfirm()}
            onPress={() => router.replace("/paywall")}
          />
          <Button
            label={m.prompt_notNow()}
            variant="plain"
            onPress={() => router.back()}
          />
        </>
      }
    >
      <View style={styles.bullets}>
        {BULLETS.map((item) => (
          <View key={item.key} style={styles.bullet}>
            <SymbolView
              name={{ ios: "checkmark", android: "check" }}
              size={15}
              tintColor={colors.accent}
              weight="semibold"
            />
            <Text style={styles.bulletText}>{item.label()}</Text>
          </View>
        ))}
      </View>
    </PromptSheet>
  );
}

const styles = StyleSheet.create({
  bullets: { gap: 14 },
  bullet: { flexDirection: "row", alignItems: "center", gap: 12 },
  bulletText: { flex: 1, fontSize: 16, color: colors.text },
});
