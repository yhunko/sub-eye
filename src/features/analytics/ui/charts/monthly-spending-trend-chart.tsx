"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
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
                color: "var(--chart-3)",
              },
            }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.monthlyTrend}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={true}
                  horizontal={true}
                  strokeDasharray="3 3"
                  opacity={0.2}
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
                  // Increased width from 40 to 65 to fit "₴1,000" comfortably
                  width={65}
                  className="text-muted-foreground font-mono text-[10px] font-medium"
                  tickFormatter={(value) => `${currencySymbol}${value}`}
                />
                <ChartTooltip
                  cursor={{
                    stroke: "var(--muted-foreground)",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-background/95 rounded-lg border p-3 shadow-md backdrop-blur-sm">
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
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-amount)"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "var(--background)",
                    stroke: "var(--color-amount)",
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: "var(--color-amount)",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};
