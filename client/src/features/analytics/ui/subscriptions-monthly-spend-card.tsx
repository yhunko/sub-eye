import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import * as m from "@/i18n/messages";
import { CurrencyText } from "@/entities/currency";
import { StatSummaryCard } from "./stat-summary-card";
import { monthlySpendSummaryQuery } from "@/entities/analytics";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useActiveSpace } from "@/shared/lib/org/use-active-space";

export const SubscriptionsMonthlySpendCard = () => {
  const { userId } = useAuth();
  const { orgId } = useActiveSpace();

  const { data, isLoading, isSuccess } = useQuery(
    monthlySpendSummaryQuery({ userId: userId!, orgId }),
  );

  if (!isSuccess && !isLoading && !data) return null;

  const delta = data?.deltaPercentage ?? null;
  const deltaLabel =
    delta === null
      ? m.analytics_monthlySpend_noData()
      : delta === 0
        ? m.analytics_monthlySpend_noChange()
        : `${delta > 0 ? "+" : ""}${delta}%`;

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
      title={m.analytics_monthlySpend_title()}
      amount={data?.currentMonthTotal ?? 0}
      currencyCode={data?.currencyCode ?? "USD"}
      isLoading={isLoading}
      trend={data?.trend}
      delta={{
        label: `${deltaLabel} ${m.analytics_monthlySpend_vsLastMonth()}`,
        tone: deltaTone,
        icon: DeltaIcon,
      }}
      secondaryInfo={
        <div className="text-muted-foreground flex items-center gap-1">
          <span>{m.analytics_monthlySpend_lastMonth()}:</span>
          <CurrencyText
            amount={data?.previousMonthTotal ?? 0}
            currencyCode={data?.currencyCode ?? "USD"}
          />
        </div>
      }
    />
  );
};
