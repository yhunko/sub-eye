import { FC } from "react";
import { useAuth } from "@clerk/clerk-react";
import { dashboardAnalyticsQuery } from "@/entities/analytics";
import { StatCardSkeleton } from "../stat-card-skeleton";
import { StatCard } from "../stat-card";
import { CurrencyText } from "@/entities/currency";
import * as m from "@/i18n/messages";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useActiveSpace } from "@/shared/lib/org/use-active-space";

export const RemainingThisMonthCard: FC = () => {
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
    <StatCard title={m.analytics_statCards_remainingThisMonth_title()}>
      <div className="space-y-1">
        <div className="text-xl font-bold">
          <CurrencyText
            amount={data.remainingThisMonth}
            currencyCode={data.preferredCurrencyCode}
          />
        </div>
        <div className="text-muted-foreground text-xs sm:text-sm">
          {m.analytics_statCards_remainingThisMonth_nextMonthForecast()}&nbsp;
          <CurrencyText
            amount={data.nextMonthForecast}
            currencyCode={data.preferredCurrencyCode}
          />
        </div>
      </div>
    </StatCard>
  );
};
