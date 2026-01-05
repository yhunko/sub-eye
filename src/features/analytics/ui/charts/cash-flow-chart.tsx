"use client";

import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  ComposedChart,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { CurrencyBadge } from "../../../currency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/shared/components/ui/chart";
import { CurrenciesMap } from "@/entities/monobank";
import { useTranslations } from "next-intl";

export function CashFlowChart() {
  const t = useTranslations("analytics.charts.cashFlow");
  const { data, isLoading } = useDashboardAnalytics();

  if (isLoading || !data)
    return <div className="bg-muted h-[300px] animate-pulse rounded-xl" />;

  const currencySymbol = CurrenciesMap.get(data.preferredCurrencyCode)?.symbol;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-2">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
            {t("30DaysTotal")}
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
          className="h-full min-h-80 w-full md:min-h-72"
        >
          <ComposedChart data={data.cashFlowForecast}>
            <defs>
              <linearGradient id="fillCumulative" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-cumulative)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-cumulative)"
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
              minTickGap={32}
              tickFormatter={(val) => format(parseISO(val), "MMM dd")}
            />
            <YAxis
              domain={[0, "auto"]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={35}
              className="text-muted-foreground font-mono text-[10px] font-medium"
              tickFormatter={(value) => `${currencySymbol}${value}`}
            />

            <ChartTooltip
              cursor
              // position={{ x: 10, y: 0 }}
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
              fill="url(#fillCumulative)"
              fillOpacity={0.7}
              stroke="var(--color-cumulative)"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 6,
                fill: "var(--background)",
                stroke: "var(--color-cumulative)",
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
