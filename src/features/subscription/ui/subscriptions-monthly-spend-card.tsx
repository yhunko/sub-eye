"use client";

import { Area, AreaChart, XAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { useSubscriptionsMonthlySpend } from "@/entities/subscription";
import { cn } from "@/shared/lib";
import { Card, CardContent, Skeleton } from "@/shared/components";
import { ChartContainer, ChartTooltip } from "@/shared/components/ui/chart";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { CurrencyText } from "@/features/currency";

export const SubscriptionsMonthlySpendCard = () => {
  const t = useTranslations("subscription.monthlySpend");

  const { data, isLoading, isSuccess } = useSubscriptionsMonthlySpend();

  if (!isSuccess && isLoading) {
    return (
      <Card className="border-border/60 bg-card/70 overflow-hidden">
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const delta = data.deltaPercentage;
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
    <Card className="border-border/60 bg-card/70 overflow-hidden px-1 py-0.5 md:py-1.5">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t("title")}
            </p>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-semibold tracking-tight">
                <CurrencyText
                  amount={data.currentMonthTotal}
                  currencyCode={data.currencyCode}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold",
                  deltaTone,
                )}
              >
                <DeltaIcon className="size-3.5" />
                {deltaLabel} {t("vsLastMonth")}
              </span>
              <div className="text-muted-foreground flex items-center gap-1">
                <span>{t("lastMonth")}:</span>
                <CurrencyText
                  amount={data.previousMonthTotal}
                  currencyCode={data.currencyCode}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 h-20">
          <ChartContainer
            config={{
              amount: {
                label: t("title"),
                color: "var(--chart-2)",
              },
            }}
            className="h-full w-full"
          >
            <AreaChart
              data={data.trend}
              margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="spendTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-amount)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-amount)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide={true} />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="border-border/60 bg-background/95 rounded-md border px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
                      <p className="text-muted-foreground">
                        {format(parseISO(item.date), "MMM yyyy")}
                      </p>
                      <div className="text-foreground font-semibold">
                        <CurrencyText
                          amount={item.amount}
                          currencyCode={data.currencyCode}
                        />
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--color-amount)"
                strokeWidth={1.5}
                fill="url(#spendTrend)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "var(--background)",
                  stroke: "var(--color-amount)",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};
