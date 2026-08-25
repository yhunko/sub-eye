import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { devForcePro } from "@/entities/pro";
import { Divider, PageFootnote, Row, Section } from "@/shared/ui/list-row";

/**
 * Debug-build-only tooling. The route that renders this (`app/(tabs)/settings/
 * developer.tsx`) reaches it through a `__DEV__` require, so nothing in this
 * folder is in a release bundle — see the comment there before adding anything.
 *
 * Copy is hardcoded English on purpose. A Paraglide key would land in
 * `shared/i18n/paraglide/messages`, which the barrel re-exports as a namespace
 * and Metro does not tree-shake — so every string here would ship, in both
 * locales, even though this screen does not. Dev tooling is not translated.
 *
 * Add a tool by adding a Row. No new screen, no new route.
 */
export function DeveloperPage() {
  const router = useRouter();
  const [forced, setForced] = useState(devForcePro.get);

  const setPro = (next: boolean) => {
    devForcePro.set(next);
    setForced(next);
  };

  // Arms one paywall state and opens the REAL route, rather than rendering a
  // copy of the screen that would drift from it. `loading` and `empty` are the
  // two states that are otherwise unreachable on a dev build — the store either
  // answers or it does not — and they are the two that break in the wild, since
  // a wrong RevenueCat key produces exactly "nothing to sell".
  const openPaywall = (
    scenario: "loading" | "empty" | undefined,
    pro: boolean,
  ) => {
    globalThis.__devPaywall = scenario;
    setPro(pro);
    router.push("/paywall");
  };

  return (
    <>
      <Stack.Screen options={{ title: "Developer" }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <Section
          title="Pro"
          footnote="Unlocks every gate on this device. A device flag, so it survives a reload — the paywall rows below set it too."
        >
          <Row
            ios="hammer"
            android="build"
            label="Force Pro"
            toggle={{ value: forced, disabled: false, onValueChange: setPro }}
          />
        </Section>

        <Section
          title="Paywall"
          footnote="One-shot: the next /paywall opened after a row talks to the real store again."
        >
          <Row
            ios="checkmark.circle"
            android="check_circle"
            label="Store ready"
            onPress={() => openPaywall(undefined, false)}
          />
          <Divider />
          <Row
            ios="hourglass"
            android="hourglass_empty"
            label="Offering loading"
            onPress={() => openPaywall("loading", false)}
          />
          <Divider />
          <Row
            ios="xmark.circle"
            android="cancel"
            label="Nothing to sell"
            onPress={() => openPaywall("empty", false)}
          />
          <Divider />
          <Row
            ios="checkmark.seal.fill"
            android="verified"
            label="Already Pro"
            onPress={() => openPaywall(undefined, true)}
          />
        </Section>

        <PageFootnote>
          Debug builds only. Metro folds this screen out of a release bundle, so
          it never reaches a user.
        </PageFootnote>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, gap: 24 },
});
