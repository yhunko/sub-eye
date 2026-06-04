import type { SubscriptionPeriod } from "@subeye/shared";
import type { FC } from "react";
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
