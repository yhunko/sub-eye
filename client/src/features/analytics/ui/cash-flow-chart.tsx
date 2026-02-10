import { FC, useMemo } from "react";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import { format, parseISO, startOfDay } from "date-fns";
import { useUser } from "@clerk/clerk-react";
import { dashboardAnalyticsQuery } from "@/entities/analytics";
import { CurrencyBadge } from "@/entities/currency";
import { CurrenciesMap } from "@shared/domains/currency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/shared/components/ui/chart";
import * as m from "@/i18n/messages";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import { DateTimezoneUtils } from "@shared/utils/dateTimezoneUtils";

type CashFlowChartProps = {
  className?: string;
};
export const CashFlowChart: FC<CashFlowChartProps> = ({ className }) => {
  const { locale } = useDateFnsLocale();
  const { user } = useUser();

  const { data } = useSuspenseQuery(
    dashboardAnalyticsQuery({
      params: { userId: user!.id },
      options: { enabled: !!user },
    }),
  );

  const today = useMemo(() => {
    if (user) {
      return startOfDay(
        DateTimezoneUtils.now(user?.publicMetadata?.preferredTimezone),
      ).toISOString();
    }
  }, [user]);

  if (!user) {
    return <div className="bg-muted h-75 animate-pulse rounded-xl" />;
  }

  const currencySymbol =
    CurrenciesMap.get(data.preferredCurrencyCode)?.symbol ?? "";

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-2">
          <CardTitle>{m.analytics_charts_cashFlow_title()}</CardTitle>
          <CardDescription>
            {m.analytics_charts_cashFlow_subtitle()}
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
            {m.analytics_charts_cashFlow_30DaysTotal()}
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
            cumulative: {
              label: m.analytics_charts_cashFlow_labels_totalNeeded(),
              color: "var(--chart-1)",
            },
            amount: {
              label: m.analytics_charts_cashFlow_labels_dailyBill(),
              color: "var(--chart-2)",
            },
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
              vertical
              horizontal
              strokeDasharray="4 4"
              stroke="var(--border)"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={10}
              tickFormatter={(val: string) =>
                format(parseISO(val), "dd", { locale })
              }
            />
            <YAxis
              domain={[0, "auto"]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={35}
              className="text-muted-foreground font-mono text-[10px] font-medium"
              tickFormatter={(value: number) => `${currencySymbol}${value}`}
            />
            <ChartTooltip
              cursor
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as {
                    date: string;
                    amount: number;
                    cumulative: number;
                  };
                  return (
                    <div className="bg-background/95 rounded-lg border p-3 shadow-md backdrop-blur-sm">
                      <p className="text-muted-foreground mb-2 text-xs font-medium">
                        {format(parseISO(item.date), "MMM dd, yyyy", {
                          locale,
                        })}
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs">
                            {m.analytics_charts_cashFlow_labels_dailyAmount()}
                          </span>
                          <CurrencyBadge
                            amount={item.amount}
                            currencyCode={data.preferredCurrencyCode}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-4 border-t pt-2">
                          <span className="text-xs font-bold">
                            {m.analytics_charts_cashFlow_labels_totalNeededLabel()}
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
            {today && (
              <ReferenceLine
                x={today}
                stroke="var(--primary)"
                strokeWidth={2.5}
                strokeOpacity={0.7}
                label={{
                  value: m.analytics_charts_cashFlow_todayLabel(),
                  position: "insideTopRight",
                  fill: "var(--primary)",
                  fontSize: 12,
                  fontWeight: 700,
                  offset: 8,
                }}
              />
            )}
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
