import { FC, useMemo } from "react";
import { PieChart, Pie, Cell } from "recharts";
import { useAuth } from "@clerk/clerk-react";
import { dashboardAnalyticsQuery } from "@/entities/analytics";
import { CurrencyText } from "@/entities/currency";
import type { CategorySpendingDto } from "shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/shared/components/ui/chart";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import { useSuspenseQuery } from "@tanstack/react-query";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type CategorySpendingChartProps = {
  className?: string;
};

function getCategoryLabel(item: CategorySpendingDto): string {
  return item.categoryId === null
    ? m.analytics_charts_categories_uncategorized()
    : item.name;
}

export const CategorySpendingChart: FC<CategorySpendingChartProps> = ({
  className,
}) => {
  const { userId } = useAuth();

  const { data: analytics } = useSuspenseQuery(
    dashboardAnalyticsQuery({
      params: { userId: userId! },
      options: { enabled: !!userId },
    }),
  );

  const categorySpending = analytics.categorySpending ?? [];

  const total = useMemo(
    () => categorySpending.reduce((sum, item) => sum + item.amount, 0),
    [categorySpending],
  );

  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        categorySpending.map((item, index) => [
          item.categoryId ?? "__uncategorized__",
          {
            label: `${item.emoji} ${getCategoryLabel(item)}`,
            color: CHART_COLORS[index % CHART_COLORS.length],
          },
        ]),
      ),
    [categorySpending],
  );

  if (!userId) {
    return (
      <div
        className={cn("bg-muted h-full animate-pulse rounded-xl", className)}
      />
    );
  }

  if (categorySpending.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{m.analytics_charts_categories_title()}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {m.analytics_charts_categories_noData()}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>{m.analytics_charts_categories_title()}</CardTitle>
        <CardDescription>
          {m.analytics_charts_categories_subtitle()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto h-48 w-full max-w-xs"
        >
          <PieChart>
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as CategorySpendingDto;
                  const percentage = ((item.amount / total) * 100).toFixed(1);
                  return (
                    <div className="bg-background/95 min-w-40 rounded-lg border p-3 shadow-md backdrop-blur-sm">
                      <p className="mb-1.5 text-sm font-medium">
                        {item.emoji} {getCategoryLabel(item)}
                      </p>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground text-xs">
                          {percentage}%
                        </span>
                        <CurrencyText
                          amount={item.amount}
                          currencyCode={analytics.preferredCurrencyCode}
                          className="text-xs font-medium tabular-nums"
                        />
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={categorySpending}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {categorySpending.map((item, index) => (
                <Cell
                  key={item.categoryId ?? "__uncategorized__"}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="space-y-2">
          {categorySpending.map((item, index) => {
            const percentage = ((item.amount / total) * 100).toFixed(1);
            return (
              <div
                key={item.categoryId ?? "__uncategorized__"}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  <span className="truncate text-sm">
                    {item.emoji} {getCategoryLabel(item)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {percentage}%
                  </span>
                  <CurrencyText
                    amount={item.amount}
                    currencyCode={analytics.preferredCurrencyCode}
                    className="text-xs tabular-nums"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
