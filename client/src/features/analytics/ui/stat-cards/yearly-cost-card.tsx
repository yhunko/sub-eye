import { FC } from "react";
import { useAuth } from "@clerk/clerk-react";
import { dashboardAnalyticsQuery } from "@/entities/analytics";
import { StatCard } from "../stat-card";
import { CurrencyText } from "@/entities/currency";
import { StatCardSkeleton } from "../stat-card-skeleton";
import * as m from "@/i18n/messages";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useActiveSpace } from "@/shared/lib/org/use-active-space";

export const YearlyCostCard: FC = () => {
  const { userId } = useAuth();
  const { orgId } = useActiveSpace();

  const { data } = useSuspenseQuery(
    dashboardAnalyticsQuery({
      params: { userId: userId!, orgId },
      options: { enabled: true },
    }),
  );

  if (!userId) return <StatCardSkeleton />;

  return (
    <StatCard title={m.analytics_statCards_yearlyCost_title()}>
      <div className="flex h-full flex-col gap-1">
        <div className="text-xl font-bold">
          <CurrencyText
            currencyCode={data.preferredCurrencyCode}
            amount={data.yearlyForecast}
          />
        </div>
        <div className="text-muted-foreground inline-flex grow items-end text-sm">
          <CurrencyText
            currencyCode={data.preferredCurrencyCode}
            amount={data.monthlyBurnRate}
          />
          <span>&nbsp;</span>
          <span>{m.common_perMonth()}</span>
        </div>
      </div>
    </StatCard>
  );
};
