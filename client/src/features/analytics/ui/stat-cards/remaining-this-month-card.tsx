import { FC } from "react";
import { StatCard } from "../stat-card";
import { CurrencyText } from "@/entities/currency";
import * as m from "@/i18n/messages";

type RemainingThisMonthCardProps = {
  remainingThisMonth: number;
  nextMonthForecast: number;
  currencyCode: string;
};

export const RemainingThisMonthCard: FC<RemainingThisMonthCardProps> = ({
  remainingThisMonth,
  nextMonthForecast,
  currencyCode,
}) => {
  return (
    <StatCard title={m.analytics_statCards_remainingThisMonth_title()}>
      <div className="space-y-1">
        <div className="text-xl font-bold">
          <CurrencyText
            amount={remainingThisMonth}
            currencyCode={currencyCode}
          />
        </div>
        <div className="text-muted-foreground text-xs sm:text-sm">
          {m.analytics_statCards_remainingThisMonth_nextMonthForecast()}&nbsp;
          <CurrencyText
            amount={nextMonthForecast}
            currencyCode={currencyCode}
          />
        </div>
      </div>
    </StatCard>
  );
};
