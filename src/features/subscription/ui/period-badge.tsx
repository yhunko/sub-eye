import { Period } from "@/shared/lib/db";
import { FC, useMemo } from "react";
import { useTranslations } from "next-intl";

type PeriodBadgeProps = {
  every: number;
  period: Period;
};

export const PeriodBadge: FC<PeriodBadgeProps> = ({ every, period }) => {
  const t = useTranslations("common.periods");

  const formatPeriod = useMemo(() => {
    const periodMap: Record<Period, string> = {
      [Period.DAY]: t("daily"),
      [Period.WEEK]: t("weekly"),
      [Period.MONTH]: t("monthly"),
      [Period.YEAR]: t("yearly"),
    };

    const pluralMap: Record<Period, string> = {
      [Period.DAY]: t("days"),
      [Period.WEEK]: t("weeks"),
      [Period.MONTH]: t("months"),
      [Period.YEAR]: t("years"),
    };

    if (every === 1) {
      return periodMap[period];
    }

    return `${every} ${pluralMap[period]}`;
  }, [every, period, t]);

  return <span>{formatPeriod}</span>;
};
