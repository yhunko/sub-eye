import { FC } from "react";
import { StatCardSkeleton } from "../stat-card-skeleton";
import { StatCard } from "../stat-card";
import { CurrencyText } from "@/entities/currency";
import { BrandfetchImage } from "@/features/brandfetch";
import * as m from "@/i18n/messages";
import type { MostExpensiveSubscriptionDto } from "shared";

type MostExpensiveSubscriptionCardProps = {
  subscription: MostExpensiveSubscriptionDto | null;
  currencyCode: string;
};

export const MostExpensiveSubscriptionCard: FC<
  MostExpensiveSubscriptionCardProps
> = ({ subscription, currencyCode }) => {
  if (!subscription) {
    return <StatCardSkeleton />;
  }

  return (
    <StatCard title={m.analytics_statCards_mostExpensive_title()}>
      <div className="flex h-full flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <BrandfetchImage domain={subscription.brandDomain} />
          <div className="text-base font-medium sm:text-xl sm:font-bold">
            {subscription.name}
          </div>
        </div>
        <div className="text-muted-foreground inline-flex grow items-end text-sm">
          <CurrencyText
            amount={subscription.yearlyAmount}
            currencyCode={currencyCode}
          />
          <span>&nbsp;</span>
          <span>{m.common_perYear()}</span>
        </div>
      </div>
    </StatCard>
  );
};
