import { FC } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { dashboardAnalyticsQuery } from "@/entities/analytics";
import { StatCardSkeleton } from "../stat-card-skeleton";
import { StatCard } from "../stat-card";
import { CurrencyText } from "@/entities/currency";
import { BrandfetchImage } from "@/features/brandfetch";
import * as m from "@/i18n/messages";

export const MostExpensiveSubscriptionCard: FC = () => {
  const { userId } = useAuth();

  const { data } = useSuspenseQuery(
    dashboardAnalyticsQuery({
      params: { userId: userId! },
      options: { enabled: true },
    }),
  );

  if (!userId) return <StatCardSkeleton />;

  if (!data.mostExpensiveSubscription) {
    return <StatCardSkeleton />;
  }

  const sub = data.mostExpensiveSubscription;

  return (
    <StatCard title={m.analytics_statCards_mostExpensive_title()}>
      <div className="flex h-full flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <BrandfetchImage domain={sub.brandDomain} />
          <div className="text-base font-medium sm:text-xl sm:font-bold">
            {sub.name}
          </div>
        </div>
        <div className="text-muted-foreground inline-flex grow items-end text-sm">
          <CurrencyText
            amount={sub.yearlyAmount}
            currencyCode={data.preferredCurrencyCode}
          />
          <span>&nbsp;</span>
          <span>{m.common_perYear()}</span>
        </div>
      </div>
    </StatCard>
  );
};
