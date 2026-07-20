import type { SubscriptionDto } from "@subeye/shared";
import type { FC } from "react";
import { BrandfetchImage } from "@/entities/brandfetch";
import { CurrencyText } from "@/entities/currency";
import { PeriodBadge } from "@/features/subscription/period";
import * as m from "@/i18n/messages";
import { cn } from "@/shared/lib/classes-utils";
import { SubscriptionOverviewStatusChip } from "./subscription-overview-status-chip";

type SubscriptionOverviewSummaryCardProps = {
  subscription: SubscriptionDto;
  formatDate?: (iso: string) => string;
};

export const SubscriptionOverviewSummaryCard: FC<
  SubscriptionOverviewSummaryCardProps
> = ({ subscription, formatDate }) => {
  const showStandardPriceNote =
    (subscription.effectivePhaseKind === "trial" ||
      subscription.effectivePhaseKind === "intro") &&
    subscription.upcomingPhase != null;

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
        <div className="space-y-2">
          <h1 className="max-w-full text-3xl leading-tight font-semibold tracking-tight wrap-break-word">
            {subscription.name}
          </h1>
          <SubscriptionOverviewStatusChip
            subscription={subscription}
            formatDate={formatDate}
          />
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
        <h2 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          {m.subscription_overview_currentPrice()}
        </h2>
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

        {showStandardPriceNote && subscription.upcomingPhase && (
          <p className="text-muted-foreground mt-3 border-t pt-3 text-xs">
            {m.subscription_overview_standardPriceNote({
              price: "",
            })}{" "}
            <CurrencyText
              currencyCode={
                subscription.upcomingPhase.billing.preferred.currencyCode
              }
              amount={subscription.upcomingPhase.billing.preferred.amount}
            />
          </p>
        )}
      </div>
    </div>
  );
};
