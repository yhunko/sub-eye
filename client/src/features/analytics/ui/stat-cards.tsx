import { FC } from "react";
import { cn } from "@/shared/lib/classes-utils";
import { ActiveSubscriptionsCard } from "./stat-cards/active-subscriptions-card";
import { YearlyCostCard } from "./stat-cards/yearly-cost-card";
import { MostExpensiveSubscriptionCard } from "./stat-cards/most-expensive-subscription-card";
import { RemainingThisMonthCard } from "./stat-cards/remaining-this-month-card";

type StatCardsProps = {
  className?: string;
};

export const StatCards: FC<StatCardsProps> = ({ className }) => {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-4",
        className,
      )}
    >
      <ActiveSubscriptionsCard />
      <MostExpensiveSubscriptionCard />
      <RemainingThisMonthCard />
      <YearlyCostCard />
    </div>
  );
};
