import { Period } from "@/shared/lib/db";
import { FC, useMemo } from "react";

type PeriodBadgeProps = {
  every: number;
  period: Period;
};

export const PeriodBadge: FC<PeriodBadgeProps> = ({ every, period }) => {
  const formatPeriod = useMemo(() => {
    const periodMap: Record<Period, string> = {
      [Period.DAY]: "Daily",
      [Period.WEEK]: "Weekly",
      [Period.MONTH]: "Monthly",
      [Period.YEAR]: "Yearly",
    };

    const pluralMap: Record<Period, string> = {
      [Period.DAY]: "Days",
      [Period.WEEK]: "Weeks",
      [Period.MONTH]: "Months",
      [Period.YEAR]: "Years",
    };

    if (every === 1) {
      return periodMap[period];
    }

    return `${every} ${pluralMap[period]}`;
  }, [every, period]);

  return <span>{formatPeriod}</span>;
};
