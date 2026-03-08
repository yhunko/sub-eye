import { FC } from "react";
import { SubscriptionPeriod } from "shared";
import { formatSubscriptionCycle } from "@/entities/subscription";

type PeriodBadgeProps = {
  every: number;
  period: SubscriptionPeriod;
  className?: string;
};

export const PeriodBadge: FC<PeriodBadgeProps> = ({
  every,
  period,
  className,
}) => {
  return (
    <span className={className}>{formatSubscriptionCycle(every, period)}</span>
  );
};
