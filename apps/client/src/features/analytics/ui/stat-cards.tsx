import type { DashboardAnalyticsDto } from "@subeye/shared";
import type { FC } from "react";
import { cn } from "@/shared/lib/classes-utils";
import { ActiveSubscriptionsCard } from "./stat-cards/active-subscriptions-card";
import { MostExpensiveSubscriptionCard } from "./stat-cards/most-expensive-subscription-card";
import { RemainingThisMonthCard } from "./stat-cards/remaining-this-month-card";
import { YearlyCostCard } from "./stat-cards/yearly-cost-card";

type StatCardsProps = {
  data: DashboardAnalyticsDto;
  className?: string;
};

export const StatCards: FC<StatCardsProps> = ({ data, className }) => {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-4",
        className,
      )}
    >
      <ActiveSubscriptionsCard
        total={data.activeSubscriptionsTotal}
        auto={data.activeSubscriptionsAuto}
        manual={data.activeSubscriptionsManual}
      />
      <MostExpensiveSubscriptionCard
        subscription={data.mostExpensiveSubscription}
        currencyCode={data.preferredCurrencyCode}
      />
      <RemainingThisMonthCard
        remainingThisMonth={data.remainingThisMonth}
        nextMonthForecast={data.nextMonthForecast}
        currencyCode={data.preferredCurrencyCode}
      />
      <YearlyCostCard
        yearlyForecast={data.yearlyForecast}
        monthlyBurnRate={data.monthlyBurnRate}
        currencyCode={data.preferredCurrencyCode}
      />
    </div>
  );
};
