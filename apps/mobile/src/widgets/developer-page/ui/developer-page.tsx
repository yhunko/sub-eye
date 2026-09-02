import { useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { devForcePro } from "@/entities/pro";
import { writeNotificationSettings } from "@/shared/lib/notifications";
import { promptFlags, promptSession } from "@/shared/lib/prompts";
import { eraseDoc, writeDoc } from "@/shared/lib/store";
import { Divider, PageFootnote, Row, Section } from "@/shared/ui/list-row";
import { buildDemoDoc } from "../model/demo-data";

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
  const client = useQueryClient();
  const [forced, setForced] = useState(devForcePro.get);

  // Bare `invalidateQueries()` rather than the entity's own invalidator: this
  // replaces the WHOLE document, preferences included, so there is no key it
  // cannot have moved.
  const reload = () => void client.invalidateQueries();

  const seed = (currency: string, locale: "en" | "uk") => {
    writeDoc(buildDemoDoc(new Date(), currency, locale));
    reload();
    Alert.alert(`Seeded demo data (${currency.toUpperCase()})`);
  };

  // Both switches on, every lead time armed. They are real UISwitches, and a
  // UISwitch ignores the synthetic taps the simulator harness sends — this is
  // the only way to put the notifications screen into its configured state
  // without a human finger.
  const armReminders = () => {
    writeNotificationSettings({
      renewals: true,
      trials: true,
      renewalLeadDays: [1, 3, 7],
      trialLeadDays: [1, 3],
      // Pinned, not merged: the patch inherits whatever hour was last stored,
      // and a capture set is only reproducible if every run lands on 09:00.
      hour: 9,
      minute: 0,
    });
    Alert.alert(
      "Reminders armed",
      "Open Notifications to rebuild the schedule.",
    );
  };

  const erase = () => {
    eraseDoc();
    reload();
    Alert.alert("Store erased");
  };

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
          title="Demo data"
          footnote="Replaces the whole store with the App Store capture set — sixteen subscriptions dated from today, so the same seed keeps working next month. Erase puts it back to first run."
        >
          <Row
            ios="dollarsign.circle"
            android="attach_money"
            label="Seed demo data · USD / EN"
            onPress={() => seed("usd", "en")}
          />
          <Divider />
          <Row
            ios="hryvniasign.circle"
            android="currency_exchange"
            label="Seed demo data · UAH / UK"
            onPress={() => seed("uah", "uk")}
          />
          <Divider />
          <Row
            ios="trash"
            android="delete"
            label="Erase everything"
            onPress={() => erase()}
          />
          <Divider />
          <Row
            ios="bell.badge"
            android="notifications_active"
            label="Arm every reminder"
            onPress={() => armReminders()}
          />
        </Section>

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

        <Section
          title="Prompts"
          footnote="The two rows above present each sheet directly, without spending its flag. Reset clears BOTH flags (Pro pitch + reminders offer), re-arms the one-per-launch guard and switches reminders off — everything the offer needs, with no relaunch. Then save a new subscription for the reminders offer, or sit on Home ~2s for the Pro pitch."
        >
          <Row
            ios="sparkles"
            android="auto_awesome"
            label="Open Pro pitch"
            onPress={() => router.push("/pro-pitch")}
          />
          <Divider />
          <Row
            ios="bell.badge"
            android="notifications_active"
            label="Open reminders offer"
            onPress={() => router.push("/reminders")}
          />
          <Divider />
          <Row
            ios="arrow.counterclockwise"
            android="restart_alt"
            label="Reset both prompts"
            onPress={() => {
              promptFlags.reset();
              // The stored flags are only half of it — the one-per-launch guard
              // is module state, and without this the row needed a relaunch.
              promptSession.reset();
              // Reminders off as well, because the reminders prompt is gated on
              // them being off and there is no other way to get there from a
              // simulator — the Settings switch is a UISwitch, which cannot be
              // driven by a synthesised tap.
              writeNotificationSettings({ renewals: false, trials: false });
              Alert.alert(
                "Prompts re-armed",
                "Both flags cleared, the one-per-launch guard re-armed, and reminders switched off. No relaunch needed: save a subscription for the reminders offer, or sit on Home ~2s for the Pro pitch.",
              );
            }}
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
