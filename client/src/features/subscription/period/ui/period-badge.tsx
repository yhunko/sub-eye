import { FC, useMemo } from "react";
import { SubscriptionPeriod } from "@shared/types";
import * as m from "@/i18n/messages";

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
  const formatPeriod = useMemo(() => {
    const periodMap: Record<SubscriptionPeriod, string> = {
      [SubscriptionPeriod.DAY]: m.periods_daily(),
      [SubscriptionPeriod.WEEK]: m.periods_weekly(),
      [SubscriptionPeriod.MONTH]: m.periods_monthly(),
      [SubscriptionPeriod.YEAR]: m.periods_yearly(),
    };

    const pluralMap: Record<SubscriptionPeriod, string> = {
      [SubscriptionPeriod.DAY]: m.periods_days(),
      [SubscriptionPeriod.WEEK]: m.periods_weeks(),
      [SubscriptionPeriod.MONTH]: m.periods_months(),
      [SubscriptionPeriod.YEAR]: m.periods_years(),
    };

    if (every === 1) {
      return periodMap[period];
    }

    return `${every} ${pluralMap[period]}`;
  }, [every, period]);

  return <span className={className}>{formatPeriod}</span>;
};
