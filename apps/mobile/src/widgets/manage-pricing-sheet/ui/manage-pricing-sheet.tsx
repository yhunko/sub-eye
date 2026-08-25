import type { StartPhaseInput } from "@subeye/model";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import {
  queuedPriceChange,
  useApplyPhaseNow,
  useCancelPhase,
  useStartPhase,
  useSubscriptionDetail,
} from "@/entities/subscription";
import { m } from "@/shared/i18n";
import {
  formatCadence,
  formatMoney,
  formatShortDate,
} from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { PendingView, ScheduleView, TemporaryPriceView } from "./pricing-views";

/** The intents that need a screen. "End the offer early" is a confirm, not a form. */
export type SheetIntent = "pending" | "schedule" | "temporary";

/**
 * One pricing intent, opened straight at its own form.
 *
 * It used to open on a MENU of the four things you might want, which every entry
 * point had to travel through first. That menu is now a UIMenu in the nav bar of
 * the detail screen and the edit form (`usePricingMenu`), so this screen has one
 * job and knows which one from the route.
 *
 * The write paths are unchanged: `startPhase` for the three that create a phase,
 * `applyPhaseNow` / `cancelPhase` for the one already queued.
 */
export function ManagePricingSheet({
  id,
  intent,
}: {
  id: string;
  intent: SheetIntent;
}) {
  const router = useRouter();
  const { data: subscription } = useSubscriptionDetail(id);

  const startPhase = useStartPhase();
  const applyNow = useApplyPhaseNow();
  const cancelPhase = useCancelPhase();

  const queued = queuedPriceChange(subscription);

  // The menu only offers this while a change is queued, so an empty one means it
  // was applied or dropped between the tap and the sheet finishing its
  // presentation — most likely from a second device over iCloud sync.
  useEffect(() => {
    if (subscription && intent === "pending" && !queued) router.back();
  }, [subscription, intent, queued, router]);

  if (!subscription) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  const close = () => router.back();

  const start = (phase: StartPhaseInput) => {
    startPhase.mutate({ id, phase });
    router.back();
  };

  // What the price is today, on every one of these screens: each of them asks
  // for a number that only means something next to it.
  const subtitle = m.pricing_menuSubtitle({
    price: formatMoney(subscription.cost, subscription.currency),
    cadence: formatCadence(subscription.every, subscription.period),
    date: formatShortDate(subscription.nextPaymentDate),
  });

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={styles.content}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      {intent === "schedule" ? (
        <ScheduleView
          subscription={subscription}
          subtitle={subtitle}
          onClose={close}
          onSubmit={start}
        />
      ) : intent === "temporary" ? (
        <TemporaryPriceView
          subscription={subscription}
          subtitle={subtitle}
          onClose={close}
          onSubmit={start}
        />
      ) : queued ? (
        <PendingView
          subscription={subscription}
          phase={queued}
          subtitle={subtitle}
          onClose={close}
          onApply={() => {
            applyNow.mutate({ id, phaseId: queued.id });
            router.back();
          }}
          onCancel={() => {
            cancelPhase.mutate({ id, phaseId: queued.id });
            router.back();
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    paddingVertical: 48,
  },
});
