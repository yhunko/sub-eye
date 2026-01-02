"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/shared/components/ui/chart";
import { CurrenciesMap } from "@/entities/monobank";
import { CurrencyBadge } from "@/features/currency/ui/currency-badge";
import { FC } from "react";
import { cn } from "@/shared/lib";

type MonthlySpendingTrendProps = {
  className?: string;
};

export const MonthlySpendingTrendChart: FC<MonthlySpendingTrendProps> = ({
  className,
}) => {
  const { data, isLoading } = useDashboardAnalytics();

  if (isLoading || !data)
    return (
      <div
        className={cn(
          "bg-muted h-[300px] w-full animate-pulse rounded-xl",
          className,
        )}
      />
    );

  const currencySymbol = CurrenciesMap.get(data.preferredCurrencyCode)?.symbol;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Monthly Spending Trend</CardTitle>
        <CardDescription>
          Projected expenses for the next 12 months.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ChartContainer
            config={{
              amount: {
                label: "Total Spending",
                color: "var(--chart-1)",
              },
            }}
            className="h-full w-full"
          >
            <AreaChart
              data={data.monthlyTrend}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-amount)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-amount)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={true}
                horizontal={true}
                strokeDasharray="4 4"
                stroke="var(--border)"
                syncWithTicks
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={(val) => format(parseISO(val), "MMM yyyy")}
                className="text-muted-foreground text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={45}
                dy={4}
                className="text-muted-foreground font-mono text-[10px] font-medium"
                tickFormatter={(value) => `${currencySymbol}${value}`}
              />
              <ChartTooltip
                cursor={{
                  stroke: "var(--border)",
                  strokeWidth: 1,
                  strokeDasharray: "0",
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-background/95 border-border rounded-lg border p-3 shadow-md backdrop-blur-sm">
                        <p className="text-muted-foreground mb-2 text-xs font-medium">
                          {format(parseISO(item.date), "MMMM yyyy")}
                        </p>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-foreground text-sm font-bold">
                            Total:
                          </span>
                          <CurrencyBadge
                            amount={item.amount}
                            currencyCode={data.preferredCurrencyCode}
                          />
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--color-amount)"
                strokeWidth={2}
                fill="url(#fillAmount)"
                fillOpacity={0.7}
                dot={false}
                activeDot={{
                  r: 6,
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
