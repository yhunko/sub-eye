import { useRouter } from "expo-router";
import type { AndroidSymbol, SFSymbol } from "expo-symbols";
import { m } from "@/shared/i18n";
import { formatShortDate } from "@/shared/lib/format";
import { presentChoice } from "@/shared/ui/present-choice";
import { useSubscriptionDetail } from "../api/detail";
import { useApplyPhaseNow } from "../api/use-phases";
import {
  offerReversion,
  type PricingIntent,
  pricingIntentsFor,
  queuedPriceChange,
} from "./pricing-intents";

export type PricingMenuItem = {
  key: PricingIntent;
  label: string;
  /** One line saying what it does. Shown by UIKit under the label. */
  subtitle?: string;
  icon: { ios: SFSymbol; android: AndroidSymbol };
  run: () => void;
};

// Message-function references, invoked at render time — never called at module
// scope, or the string freezes in whichever locale was active at import.
const LABEL: Record<PricingIntent, () => string> = {
  pending: m.pricing_pendingTitle,
  schedule: m.pricing_scheduleTitle,
  temporary: m.pricing_temporaryTitle,
  endOffer: m.pricing_endOfferTitle,
};

const ICON: Record<PricingIntent, { ios: SFSymbol; android: AndroidSymbol }> = {
  pending: { ios: "clock.badge.checkmark", android: "schedule" },
  // The price itself against a discount on it — which is the whole difference
  // between the two things you can do to one. Arrows were tried and read as
  // navigation rather than as meaning.
  schedule: { ios: "banknote", android: "payments" },
  temporary: { ios: "percent", android: "percent" },
  endOffer: { ios: "forward.end", android: "skip_next" },
};

/**
 * Everything you can do to a price, as menu items.
 *
 * This is the ONLY way in: a native dropdown in the nav bar of the detail screen
 * and of the edit form, rather than a screen listing the same four things. The
 * list replaced an intent screen that every entry point had to travel through
 * first — a menu is where UIKit puts a choice between actions, and it is one tap
 * closer from both.
 *
 * Two of them open the sheet straight at their own form. "End the offer early"
 * has no form — it is one confirm and one write — so it never routes.
 */
export function usePricingMenu(id: string): PricingMenuItem[] {
  const router = useRouter();
  const { data: subscription } = useSubscriptionDetail(id);
  const applyNow = useApplyPhaseNow();

  // The same permission the single "Manage pricing" row used to be minted from:
  // the store decides whether a phase may be started at all, and none of the
  // four is offerable when it may not.
  const allowed = subscription?.allowedActions.includes("addPhase") ?? false;

  const queued = queuedPriceChange(subscription);
  const reversion = offerReversion(subscription);

  const open = (intent: PricingIntent) =>
    router.push({
      pathname: "/subscriptions/[id]/pricing",
      params: { id, intent },
    });

  const endOffer = () => {
    if (!reversion) return;
    presentChoice(
      m.pricing_endOfferTitle(),
      m.pricing_endOfferHint({ date: formatShortDate(reversion.startsAt) }),
      [
        {
          label: m.pricing_applyNow(),
          onPress: () => applyNow.mutate({ id, phaseId: reversion.id }),
        },
      ],
    );
  };

  const subtitle: Partial<Record<PricingIntent, string>> = {
    pending: queued
      ? m.pricing_pendingRow({
          price: String(queued.cost),
          date: formatShortDate(queued.startsAt),
        })
      : undefined,
    schedule: m.pricing_scheduleHint(),
    temporary: m.pricing_temporaryHint(),
    endOffer: reversion
      ? m.pricing_endOfferHint({ date: formatShortDate(reversion.startsAt) })
      : undefined,
  };

  if (!allowed) return [];

  return pricingIntentsFor(subscription).map((key) => ({
    key,
    label: LABEL[key](),
    subtitle: subtitle[key],
    icon: ICON[key],
    run: key === "endOffer" ? endOffer : () => open(key),
  }));
}
