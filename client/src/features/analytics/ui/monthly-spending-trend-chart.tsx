import { FC, Suspense, lazy, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { dashboardAnalyticsQuery } from "@/entities/analytics";
import { CurrenciesMap } from "shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import type { MonthlySpendingTrendVariantProps } from "./monthly-spending-trend-chart.types";

const MonthlySpendingTrendChartDesktop = lazy(
  () => import("./monthly-spending-trend-chart.desktop"),
);
const MonthlySpendingTrendChartMobile = lazy(
  () => import("./monthly-spending-trend-chart.mobile"),
);

type MonthlySpendingTrendChartProps = {
  className?: string;
};

export const MonthlySpendingTrendChart: FC<MonthlySpendingTrendChartProps> = ({
  className,
}) => {
  const { userId } = useAuth();
  const { locale } = useDateFnsLocale();
  const isDesktop = useBreakpoint("md");

  const { data } = useSuspenseQuery(
    dashboardAnalyticsQuery({
      params: { userId: userId! },
      options: { enabled: true },
    }),
  );

  const currencySymbol =
    CurrenciesMap.get(data.preferredCurrencyCode)?.symbol ?? "";

  const yAxisWidth = useMemo(() => {
    const maxAmount = Math.max(0, ...data.monthlyTrend.map((d) => d.amount));

    const formatted = `${currencySymbol}${maxAmount.toLocaleString(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    })}`;

    const charWidth = 7;
    const padding = 12;
    return Math.max(45, formatted.length * charWidth + padding);
  }, [data.monthlyTrend, currencySymbol]);

  if (!userId) {
    return (
      <div
        className={cn(
          "bg-muted h-75 w-full animate-pulse rounded-xl",
          className,
        )}
      />
    );
  }

  const variantProps: MonthlySpendingTrendVariantProps = {
    monthlyTrend: data.monthlyTrend,
    preferredCurrencyCode: data.preferredCurrencyCode,
    currencySymbol,
    yAxisWidth,
    locale,
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{m.analytics_charts_monthlySpending_title()}</CardTitle>
        <CardDescription>
          {m.analytics_charts_monthlySpending_subtitle()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense
          fallback={<div className="bg-muted h-75 w-full rounded-xl" />}
        >
          {isDesktop ? (
            <MonthlySpendingTrendChartDesktop {...variantProps} />
          ) : (
            <MonthlySpendingTrendChartMobile {...variantProps} />
          )}
        </Suspense>
      </CardContent>
    </Card>
  );
};
