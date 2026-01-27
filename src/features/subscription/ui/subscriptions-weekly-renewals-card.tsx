"use client";

import { useWeeklyRenewalsSummary } from "@/entities/analytics/api/hooks";
import { useTranslations } from "next-intl";
import { CurrencyText } from "@/features/currency";
import { StatSummaryCard } from "./stat-summary-card";

export const SubscriptionsWeeklyRenewalsCard = () => {
  const t = useTranslations("subscription.weeklyRenewals");

  const { data, isLoading, isSuccess } = useWeeklyRenewalsSummary();

  if (!isSuccess && !isLoading && !data) return null;

  return (
    <StatSummaryCard
      title={t("title")}
      amount={data?.totalUpcomingWeek ?? 0}
      currencyCode={data?.currencyCode ?? "USD"}
      isLoading={isLoading}
      trend={data?.trend}
      chartColor="var(--chart-3)"
      tooltipDateFormat="EEEE, MMM dd"
      secondaryInfo={
        <div className="text-muted-foreground flex items-center gap-1">
          <span>{t("total")}:</span>
          <CurrencyText
            amount={data?.totalThisWeek ?? 0}
            currencyCode={data?.currencyCode ?? "USD"}
          />
        </div>
      }
    />
  );
};
