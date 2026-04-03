import { format } from "date-fns";
import type { FC } from "react";
import type { SubscriptionDto } from "shared";
import { CurrencyText } from "@/entities/currency";
import { BrandfetchImage } from "@/features/brandfetch";
import { PeriodBadge } from "@/features/subscription/period";
import * as m from "@/i18n/messages";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { cn } from "@/shared/lib/classes-utils";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import { SubscriptionOverviewScheduledPriceChangeAlert } from "./subscription-overview-scheduled-price-change-alert";

type SubscriptionOverviewSummaryCardProps = {
  subscription: SubscriptionDto;
};

export const SubscriptionOverviewSummaryCard: FC<
  SubscriptionOverviewSummaryCardProps
> = ({ subscription }) => {
  const { dateFnsFormat } = useDateFormat();
  const { locale } = useDateFnsLocale();

  const scheduledDateLabel = subscription.scheduledPriceChange
    ? format(
        new Date(subscription.scheduledPriceChange.effectiveAt),
        dateFnsFormat,
        { locale },
      )
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <BrandfetchImage
          domain={subscription.brandDomain}
          alt={subscription.name}
          className={cn(
            "size-24 border-2 shadow-sm md:size-28",
            subscription.status === "cancelled" && "grayscale",
          )}
        />
        <div className="space-y-1">
          <h1 className="max-w-full text-3xl leading-tight font-semibold tracking-tight wrap-break-word">
            {subscription.name}
          </h1>
          <div className="text-muted-foreground inline-flex items-center gap-2 text-sm">
            <PeriodBadge
              every={subscription.every}
              period={subscription.period}
            />
            <span aria-hidden>•</span>
            <CurrencyText
              currencyCode={subscription.billing.preferred.currencyCode}
              amount={subscription.billing.preferred.amount}
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border p-4">
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-sm">
              {m.subscription_price_monthly()}
            </span>
            <div className="inline-flex items-center text-right text-base font-semibold">
              <CurrencyText
                currencyCode={subscription.billing.preferred.currencyCode}
                amount={subscription.billing.preferred.monthly}
              />
              &nbsp;
              <span className="text-xs">{m.common_perMonth()}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-sm">
              {m.subscription_price_yearly()}
            </span>
            <div className="inline-flex items-center text-right text-base font-semibold">
              <CurrencyText
                currencyCode={subscription.billing.preferred.currencyCode}
                amount={subscription.billing.preferred.yearly}
              />
              &nbsp;
              <span className="text-xs">{m.common_perYear()}</span>
            </div>
          </div>
        </div>

        <SubscriptionOverviewScheduledPriceChangeAlert
          subscription={subscription}
          scheduledDateLabel={scheduledDateLabel}
        />
      </div>
    </div>
  );
};
