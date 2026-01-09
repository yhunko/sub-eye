"use client";

import { FC } from "react";
import { cn } from "@/shared/lib";
import { ActiveSubscriptionsCard } from "./stats/active-subscriptions-card";
import { YearlyCostCard } from "./stats/yearly-cost-card";
import { MostExpensiveSubscriptionCard } from "./stats/most-expensive-subscription-card";
import { RemainingThisMonthCard } from "./stats/remaining-this-month-card";

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
