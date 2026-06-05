import type { MonthlyTrendPoint } from "@subeye/shared";
import { CurrenciesMap } from "@subeye/shared";
import { addMonths, isSameMonth, parseISO } from "date-fns";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { type FC, lazy, Suspense, useMemo } from "react";
import * as m from "@/i18n/messages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { cn } from "@/shared/lib/classes-utils";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import type { MonthlySpendingTrendVariantProps } from "./monthly-spending-trend-chart.types";

const MonthlySpendingTrendChartDesktop = lazy(
  () => import("./monthly-spending-trend-chart.desktop"),
);
const MonthlySpendingTrendChartMobile = lazy(
  () => import("./monthly-spending-trend-chart.mobile"),
);

type MonthlySpendingTrendChartProps = {
  monthlyTrend: MonthlyTrendPoint[];
  preferredCurrencyCode: string;
  className?: string;
};

export const MonthlySpendingTrendChart: FC<MonthlySpendingTrendChartProps> = ({
  monthlyTrend,
  preferredCurrencyCode,
  className,
}) => {
  const { locale } = useDateFnsLocale();
  const isDesktop = useBreakpoint("md");

  const currencySymbol = CurrenciesMap.get(preferredCurrencyCode)?.symbol ?? "";

  const yAxisWidth = useMemo(() => {
    const maxAmount = Math.max(0, ...monthlyTrend.map((d) => d.amount));

    const formatted = `${currencySymbol}${maxAmount.toLocaleString(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    })}`;

    const charWidth = 7;
    const padding = 12;
    return Math.max(45, formatted.length * charWidth + padding);
  }, [monthlyTrend, currencySymbol]);

  const monthComparisonBadge = useMemo(() => {
    const now = new Date();
    const currentMonth = monthlyTrend.find((point) =>
      isSameMonth(parseISO(point.date), now),
    );
    const previousMonthDate = addMonths(now, -1);
    const previousMonth = monthlyTrend.find((point) =>
      isSameMonth(parseISO(point.date), previousMonthDate),
    );

    if (!currentMonth || !previousMonth) {
      return null;
    }

    const amountDelta = currentMonth.amount - previousMonth.amount;
    const deltaPercentage =
      previousMonth.amount > 0
        ? (amountDelta / previousMonth.amount) * 100
        : null;

    if (deltaPercentage === null) {
      return {
        label: m.analytics_monthlySpend_noData(),
        shortLabel: m.analytics_monthlySpend_noData(),
        tone: "bg-muted text-muted-foreground",
        Icon: Minus,
      } as const;
    }

    return {
      label: `${amountDelta > 0 ? "+" : ""}${deltaPercentage.toFixed(1)}% ${m.analytics_monthlySpend_vsLastMonth()}`,
      shortLabel: `${amountDelta > 0 ? "+" : ""}${deltaPercentage.toFixed(1)}%`,
      tone:
        amountDelta === 0
          ? "bg-muted text-muted-foreground"
          : amountDelta > 0
            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      Icon:
        amountDelta === 0 ? Minus : amountDelta > 0 ? TrendingUp : TrendingDown,
    };
  }, [monthlyTrend]);

  const variantProps: MonthlySpendingTrendVariantProps = {
    monthlyTrend,
    preferredCurrencyCode,
    currencySymbol,
    yAxisWidth,
    locale,
  };

  return (
    <Card className={cn("relative h-full w-full", className)}>
      {monthComparisonBadge && (
        <span
          className={cn(
            "absolute top-6 right-4 inline-flex max-w-xs items-center gap-1 overflow-hidden rounded-full px-2 py-0.5 text-[11px] font-medium sm:max-w-lg",
            monthComparisonBadge.tone,
          )}
          title={monthComparisonBadge.label}
        >
          <monthComparisonBadge.Icon className="size-3 shrink-0" />
          <span className="truncate sm:hidden">
            {monthComparisonBadge.shortLabel}
          </span>
          <span className="hidden truncate sm:inline">
            {monthComparisonBadge.label}
          </span>
        </span>
      )}

      <CardHeader>
        <CardTitle className="leading-tight text-pretty">
          {m.analytics_charts_monthlySpending_title()}
        </CardTitle>
        <CardDescription className="mt-1 leading-snug wrap-break-word whitespace-normal">
          {m.analytics_charts_monthlySpending_subtitle()}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("flex-1", isDesktop && "flex min-h-[22rem]")}>
        <Suspense
          fallback={
            <div className="bg-muted h-full min-h-[18rem] w-full rounded-xl" />
          }
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
