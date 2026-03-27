import { FC } from "react";
import { StatCard } from "../stat-card";
import { CurrencyText } from "@/entities/currency";
import * as m from "@/i18n/messages";

type YearlyCostCardProps = {
  yearlyForecast: number;
  monthlyBurnRate: number;
  currencyCode: string;
};

export const YearlyCostCard: FC<YearlyCostCardProps> = ({
  yearlyForecast,
  monthlyBurnRate,
  currencyCode,
}) => {
  return (
    <StatCard title={m.analytics_statCards_yearlyCost_title()}>
      <div className="flex h-full flex-col gap-1">
        <div className="text-xl font-bold">
          <CurrencyText currencyCode={currencyCode} amount={yearlyForecast} />
        </div>
        <div className="text-muted-foreground inline-flex grow items-end text-sm">
          <CurrencyText currencyCode={currencyCode} amount={monthlyBurnRate} />
          <span>&nbsp;</span>
          <span>{m.common_perMonth()}</span>
        </div>
      </div>
    </StatCard>
  );
};
