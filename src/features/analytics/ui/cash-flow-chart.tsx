"use client";

import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  ComposedChart,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns"; // Import date-fns here
import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { CurrencyBadge } from "@/features/currency/ui/currency-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/shared/components/ui/chart";
import { CurrenciesMap } from "@/entities/monobank";

export function CashFlowChart() {
  const { data, isLoading } = useDashboardAnalytics();

  if (isLoading || !data)
    return <div className="bg-muted h-[300px] animate-pulse rounded-xl" />;

  const currencySymbol = CurrenciesMap.get(data.preferredCurrencyCode)?.symbol;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-2">
          <CardTitle>Cash Flow Forecast</CardTitle>
          <CardDescription>
            Cumulative funds needed for the next 30 days.
          </CardDescription>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
            30-Day Total
          </span>
          <CurrencyBadge
            amount={data.totalUpcomingMonth}
            currencyCode={data.preferredCurrencyCode}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            cumulative: { label: "Total Needed", color: "var(--chart-1)" },
            amount: { label: "Daily Bill", color: "var(--chart-2)" },
          }}
          className="w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.cashFlowForecast}>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                opacity={0.3}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={32}
                tickFormatter={(val) => format(parseISO(val), "MMM dd")}
              />
              <YAxis
                domain={[0, "auto"]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={40}
                className="text-muted-foreground font-mono text-[10px] font-medium"
                tickFormatter={(value) => `${currencySymbol}${value}`}
              />

              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-background/95 rounded-lg border p-3 shadow-md backdrop-blur-sm">
                        <p className="text-muted-foreground mb-2 text-xs font-medium">
                          {format(parseISO(item.date), "MMM dd, yyyy")}
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs">Daily Amount:</span>
                            <CurrencyBadge
                              amount={item.amount}
                              currencyCode={data.preferredCurrencyCode}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-4 border-t pt-2">
                            <span className="text-xs font-bold">
                              Total Needed:
                            </span>
                            <CurrencyBadge
                              amount={item.cumulative}
                              currencyCode={data.preferredCurrencyCode}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Bar
                dataKey="amount"
                fill="var(--color-amount)"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                fill="var(--color-cumulative)"
                fillOpacity={0.1}
                stroke="var(--color-cumulative)"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
