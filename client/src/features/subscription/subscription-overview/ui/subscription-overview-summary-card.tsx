import { FC } from "react";
import { CurrencyText } from "@/entities/currency";
import { BrandfetchImage } from "@/features/brandfetch";
import { PeriodBadge } from "@/features/subscription/period";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import type { SubscriptionDto } from "shared";

type SubscriptionOverviewSummaryCardProps = {
  subscription: SubscriptionDto;
};

export const SubscriptionOverviewSummaryCard: FC<
  SubscriptionOverviewSummaryCardProps
> = ({ subscription }) => {
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
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-sm">
            {m.form_basicInfo_cost_label()}
          </span>
          <div className="inline-flex items-center text-right text-lg">
            <CurrencyText
              currencyCode={subscription.billing.preferred.currencyCode}
              amount={subscription.billing.preferred.monthly}
            />
            &nbsp;
            <span className="text-sm">{m.common_perMonth()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
