import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
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
 * difference between an offer and an interception.
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
    <View style={styles.sheet}>
      {/* `flexShrink`, never `flex: 1` — the sheet measures itself against this
          and `flex: 1` is basis 0, which in a fitted sheet collapses the whole
          thing to nothing. Shrink lets it take its natural height normally, and
          give height back (scrolling instead) at the accessibility text sizes,
          where these six lines run past what any detent can show. */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <SymbolView
          name={{ ios: "sparkles", android: "auto_awesome" }}
          size={30}
          tintColor={colors.accent}
        />

        <View style={styles.copy}>
          <Text style={styles.title}>{m.prompt_proTitle()}</Text>
          <Text style={styles.subtitle}>{m.prompt_proBody()}</Text>
        </View>

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
      </ScrollView>

      <View style={styles.actions}>
        {/* `replace`, not push-on-top: backing out of the paywall should land
            on Home, not on the sheet that sent them there. */}
        <Button
          label={m.prompt_proConfirm()}
          onPress={() => router.replace("/paywall")}
        />
        <Button
          label={m.prompt_notNow()}
          variant="plain"
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // No height and no `flex: 1` anywhere above the scroller: the sheet's detent
  // is computed FROM this, so anything that measures to zero takes the sheet
  // with it. The bottom padding is small because a fitted sheet already pays
  // for the home indicator itself — paying again left a band of empty card
  // under the last button.
  sheet: { paddingHorizontal: 26, paddingTop: 26, paddingBottom: 14, gap: 20 },
  body: { flexShrink: 1 },
  bodyContent: { gap: 20 },
  copy: { gap: 10 },
  title: { fontSize: 26, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 17, lineHeight: 24, color: colors.muted },
  bullets: { gap: 14 },
  bullet: { flexDirection: "row", alignItems: "center", gap: 12 },
  bulletText: { flex: 1, fontSize: 16, color: colors.text },
  actions: { gap: 6 },
});
