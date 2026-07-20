import NiceModal from "@ebay/nice-modal-react";
import type { SubscriptionDto } from "@subeye/shared";
import {
  BadgePercent,
  Ban,
  CalendarClock,
  CalendarX,
  Gift,
  type LucideIcon,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { type FC, useCallback } from "react";
import { toast } from "sonner";
import {
  useApplyPhaseNow,
  useCancelPhase,
  useCancelSubscription,
} from "@/entities/subscription";
import * as m from "@/i18n/messages";
import { cn } from "@/shared/lib/classes-utils";
import { openIntroDiscountDialog } from "../../intro-discount";
import { useScheduledPriceChangeActions } from "../../schedule-price-change";
import { openStartTrialDialog } from "../../start-trial";

type ActionTone = "sky" | "violet" | "amber" | "emerald" | "neutral";

const toneChipClass: Record<ActionTone, string> = {
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  neutral: "bg-muted text-muted-foreground",
};

type ManageTile = {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: ActionTone;
  onClick: () => void;
};

type SubscriptionOverviewManageActionsProps = {
  subscription: SubscriptionDto;
};

export const SubscriptionOverviewManageActions: FC<
  SubscriptionOverviewManageActionsProps
> = ({ subscription }) => {
  const { openScheduleDialog } = useScheduledPriceChangeActions({
    subscription,
  });
  const { mutate: applyPhaseNow, isPending: isApplyPending } =
    useApplyPhaseNow();
  const { mutate: cancelPhase, isPending: isCancelPhasePending } =
    useCancelPhase();
  const { mutate: cancelSubscription, isPending: isCancelPending } =
    useCancelSubscription();

  const id = subscription.id;
  const name = subscription.name;
  const upcomingPhaseId = subscription.upcomingPhase?.id;

  const phaseSettled = {
    onSuccess: () => toast.success(m.messages_updated()),
    onError: () => toast.error(m.messages_error()),
  };

  const openTrial = useCallback(() => {
    void openStartTrialDialog({
      subscriptionId: id,
      subscriptionName: name,
      currentCost: subscription.cost,
      currentCurrency: subscription.currency,
    });
  }, [id, name, subscription.cost, subscription.currency]);

  const openIntro = useCallback(() => {
    void openIntroDiscountDialog({
      subscriptionId: id,
      subscriptionName: name,
      currentCost: subscription.cost,
      currentCurrency: subscription.currency,
    });
  }, [id, name, subscription.cost, subscription.currency]);

  const openCancel = useCallback(async () => {
    const { SubscriptionCancelDialog } = await import(
      "../../subscription-cancel-dialog"
    );
    await NiceModal.show(SubscriptionCancelDialog, {
      subscriptionId: id,
      subscriptionName: name,
      nextBillingDate: subscription.nextPaymentDate,
    });
  }, [id, name, subscription.nextPaymentDate]);

  const openResume = useCallback(async () => {
    const { SubscriptionResumeDialog } = await import(
      "../../subscription-resume-dialog"
    );
    await NiceModal.show(SubscriptionResumeDialog, {
      subscriptionId: id,
      subscriptionName: name,
      nextPaymentDate: subscription.nextPaymentDate,
    });
  }, [id, name, subscription.nextPaymentDate]);

  const applyUpcomingNow = () => {
    if (upcomingPhaseId) {
      applyPhaseNow({ id, phaseId: upcomingPhaseId }, phaseSettled);
    }
  };
  const cancelUpcoming = () => {
    if (upcomingPhaseId) {
      cancelPhase({ id, phaseId: upcomingPhaseId }, phaseSettled);
    }
  };
  const cancelImmediately = () => {
    cancelSubscription({ id, mode: "immediate" }, phaseSettled);
  };

  const busy = isApplyPending || isCancelPhasePending || isCancelPending;
  const status = subscription.status;
  const kind = subscription.effectivePhaseKind;

  let hero: { label: string; icon: LucideIcon; onClick: () => void } | null =
    null;
  let tiles: ManageTile[] = [];
  let destructive: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
  } | null = null;

  if (status === "cancelled") {
    hero = {
      label: m.subscription_manage_reactivate(),
      icon: RotateCcw,
      onClick: () => void openResume(),
    };
  } else if (status === "cancelledButActive") {
    hero = {
      label: m.subscription_manage_resume(),
      icon: RotateCcw,
      onClick: () => void openResume(),
    };
    destructive = {
      label: m.subscription_cancel_immediate(),
      icon: Ban,
      onClick: cancelImmediately,
    };
  } else if (kind === "trial") {
    tiles = [
      {
        key: "end-trial",
        label: m.subscription_manage_endTrialNow(),
        icon: Zap,
        tone: "emerald",
        onClick: applyUpcomingNow,
      },
      {
        key: "edit-trial",
        label: m.subscription_manage_editTrial(),
        icon: Pencil,
        tone: "neutral",
        onClick: openTrial,
      },
    ];
    destructive = {
      label: m.subscription_manage_cancel(),
      icon: Ban,
      onClick: () => void openCancel(),
    };
  } else if (kind === "intro") {
    tiles = [
      {
        key: "end-discount",
        label: m.subscription_manage_endDiscountNow(),
        icon: Zap,
        tone: "emerald",
        onClick: applyUpcomingNow,
      },
      {
        key: "edit-discount",
        label: m.subscription_manage_editDiscount(),
        icon: Pencil,
        tone: "neutral",
        onClick: openIntro,
      },
    ];
    destructive = {
      label: m.subscription_manage_cancel(),
      icon: Ban,
      onClick: () => void openCancel(),
    };
  } else if (subscription.upcomingPhase?.kind === "scheduledChange") {
    tiles = [
      {
        key: "apply-now",
        label: m.subscription_manage_applyChangeNow(),
        icon: Zap,
        tone: "emerald",
        onClick: applyUpcomingNow,
      },
      {
        key: "cancel-change",
        label: m.subscription_manage_cancelChange(),
        icon: CalendarX,
        tone: "amber",
        onClick: cancelUpcoming,
      },
    ];
    destructive = {
      label: m.subscription_manage_cancel(),
      icon: Ban,
      onClick: () => void openCancel(),
    };
  } else {
    tiles = [
      {
        key: "schedule",
        label: m.subscription_manage_schedulePriceChange(),
        icon: CalendarClock,
        tone: "amber",
        onClick: openScheduleDialog,
      },
      {
        key: "trial",
        label: m.subscription_manage_startTrial(),
        icon: Gift,
        tone: "sky",
        onClick: openTrial,
      },
      {
        key: "intro",
        label: m.subscription_manage_addDiscount(),
        icon: BadgePercent,
        tone: "violet",
        onClick: openIntro,
      },
    ];
    destructive = {
      label: m.subscription_manage_cancel(),
      icon: Ban,
      onClick: () => void openCancel(),
    };
  }

  const HeroIcon = hero?.icon;
  const DestructiveIcon = destructive?.icon;

  return (
    <div className="from-card to-card/70 ring-border/70 rounded-2xl bg-gradient-to-b p-4 shadow-sm ring-1">
      <div className="mb-3 flex items-center gap-2">
        <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg">
          <SlidersHorizontal className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm leading-none font-semibold">
            {m.subscription_manage_title()}
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {hero && HeroIcon && (
          <button
            type="button"
            onClick={hero.onClick}
            disabled={busy}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            <HeroIcon className="size-[18px]" aria-hidden />
            {hero.label}
          </button>
        )}

        {tiles.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tiles.map((tile) => {
              const TileIcon = tile.icon;
              return (
                <button
                  key={tile.key}
                  type="button"
                  onClick={tile.onClick}
                  disabled={busy}
                  className="group bg-background/60 hover:border-foreground/20 hover:bg-accent flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                      toneChipClass[tile.tone],
                    )}
                  >
                    <TileIcon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="text-sm leading-tight font-medium">
                    {tile.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {destructive && DestructiveIcon && (
          <div
            className={cn(
              hero || tiles.length > 0 ? "mt-1 border-t pt-3" : undefined,
            )}
          >
            <button
              type="button"
              onClick={destructive.onClick}
              disabled={busy}
              className="text-muted-foreground hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive flex w-full items-center justify-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
            >
              <DestructiveIcon className="size-4" aria-hidden />
              {destructive.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
