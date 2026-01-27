"use client";

import { useMonthlySpendSummary } from "@/entities/analytics/api/hooks";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { CurrencyText } from "@/features/currency";
import { StatSummaryCard } from "./stat-summary-card";

export const SubscriptionsMonthlySpendCard = () => {
  const t = useTranslations("subscription.monthlySpend");

  const { data, isLoading, isSuccess } = useMonthlySpendSummary();

  if (!isSuccess && !isLoading && !data) return null;

  const delta = data?.deltaPercentage ?? null;
  const deltaLabel =
    delta === null ? t("noData") : `${delta > 0 ? "+" : ""}${delta}%`;
  const deltaTone =
    delta === null || delta === 0
      ? "bg-muted text-muted-foreground"
      : delta < 0
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        : "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  const DeltaIcon =
    delta === null || delta === 0
      ? Minus
      : delta < 0
        ? TrendingDown
        : TrendingUp;

  return (
    <StatSummaryCard
      title={t("title")}
      amount={data?.currentMonthTotal ?? 0}
      currencyCode={data?.currencyCode ?? "USD"}
      isLoading={isLoading}
      trend={data?.trend}
      delta={{
        label: `${deltaLabel} ${t("vsLastMonth")}`,
        tone: deltaTone,
        icon: DeltaIcon,
      }}
      secondaryInfo={
        <div className="text-muted-foreground flex items-center gap-1">
          <span>{t("lastMonth")}:</span>
          <CurrencyText
            amount={data?.previousMonthTotal ?? 0}
            currencyCode={data?.currencyCode ?? "USD"}
          />
        </div>
      }
    />
  );
};
