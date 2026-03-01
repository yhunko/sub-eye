import { format } from "date-fns";
import { CalendarDays, CheckIcon, PencilIcon, Trash2 } from "lucide-react";
import type { SubscriptionDto } from "shared";
import { CurrencyText } from "@/entities/currency";
import * as m from "@/i18n/messages";
import { Button, Separator } from "@/shared/components";
import { scheduledPriceChangeAlertStyles } from "@/features/subscription/lib/scheduled-price-change-alert-styles";
import { useScheduledPriceChangeActions } from "@/features/subscription/schedule-price-change";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import { cn } from "@/shared/lib/classes-utils";

type SubscriptionFormScheduledPriceChangeCardProps = {
  subscription?: SubscriptionDto;
};

export const SubscriptionFormScheduledPriceChangeCard = ({
  subscription,
}: SubscriptionFormScheduledPriceChangeCardProps) => {
  const { dateFnsFormat } = useDateFormat();
  const { locale } = useDateFnsLocale();
  const {
    openScheduleDialog,
    applyScheduledNow,
    cancelScheduled,
    isApplyNowPending,
    isCancelPending,
  } = useScheduledPriceChangeActions({
    subscription,
  });

  if (!subscription?.scheduledPriceChange) {
    return null;
  }

  const scheduledDateLabel = format(
    new Date(subscription.scheduledPriceChange.effectiveAt),
    dateFnsFormat,
    { locale },
  );

  return (
    <>
      <Separator />
      <section
        className={cn("relative", scheduledPriceChangeAlertStyles.container)}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            "absolute top-2 right-2",
            scheduledPriceChangeAlertStyles.iconButton,
          )}
          aria-label={m.subscription_priceChange_action_edit()}
          onClick={openScheduleDialog}
        >
          <PencilIcon className="size-3.5" />
        </Button>

        <div
          className={cn(scheduledPriceChangeAlertStyles.headingWrap, "pr-8")}
        >
          <span className={scheduledPriceChangeAlertStyles.iconBadge}>
            <CalendarDays className="size-4" />
          </span>
          <div>
            <p className={scheduledPriceChangeAlertStyles.title}>
              {m.subscription_priceChange_pendingCard_title()}
            </p>
            <p className={scheduledPriceChangeAlertStyles.subtitle}>
              {m.subscription_priceChange_pendingCard_description({
                date: scheduledDateLabel,
              })}
            </p>
          </div>
        </div>

        <div className={cn("mt-2", scheduledPriceChangeAlertStyles.panel)}>
          <div className="flex flex-wrap items-center gap-1 text-sm font-medium">
            <div className={scheduledPriceChangeAlertStyles.comparisonCurrent}>
              <CurrencyText
                currencyCode={subscription.currency}
                amount={subscription.cost}
              />
            </div>
            <span
              className={scheduledPriceChangeAlertStyles.comparisonArrow}
              aria-hidden
            >
              →
            </span>
            <div
              className={scheduledPriceChangeAlertStyles.comparisonScheduled}
            >
              <CurrencyText
                currencyCode={subscription.scheduledPriceChange.currency}
                amount={subscription.scheduledPriceChange.cost}
              />
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-full border-amber-400/45 bg-transparent px-3 text-xs text-amber-900 hover:bg-amber-500/10 dark:border-amber-300/35 dark:text-amber-100 dark:hover:bg-amber-300/10"
            disabled={isApplyNowPending}
            onClick={applyScheduledNow}
          >
            <CheckIcon className="size-3.5" />
            {m.subscription_priceChange_pendingCard_applyNow()}
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive size-8 rounded-full"
            disabled={isCancelPending}
            aria-label={m.subscription_priceChange_pendingCard_cancel()}
            onClick={cancelScheduled}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </section>
    </>
  );
};
