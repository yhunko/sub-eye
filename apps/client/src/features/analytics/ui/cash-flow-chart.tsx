import type { CashFlowPoint, CashFlowSubscription } from "@subeye/shared";
import { CurrenciesMap, DateTimezoneUtils } from "@subeye/shared";
import { format, parseISO, startOfDay } from "date-fns";
import { type FC, useMemo } from "react";
import { BrandfetchImage } from "@/entities/brandfetch";
import { CurrencyBadge, CurrencyText } from "@/entities/currency";
import * as m from "@/i18n/messages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { ChartContainer } from "@/shared/components/ui/chart";
import { track } from "@/shared/lib/analytics";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import { useRechartsModule } from "./use-recharts-module";

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

type CashFlowChartProps = {
  cashFlowForecast: CashFlowPoint[];
  totalUpcomingMonth: number;
  preferredCurrencyCode: string;
  timezone: string;
  className?: string;
};

export const CashFlowChart: FC<CashFlowChartProps> = ({
  cashFlowForecast,
  totalUpcomingMonth,
  preferredCurrencyCode,
  timezone,
  className,
}) => {
  const { locale } = useDateFnsLocale();
  const Recharts = useRechartsModule();

  const todayTimestamp = useMemo(() => {
    return startOfDay(DateTimezoneUtils.now(timezone)).getTime();
  }, [timezone]);

  const chartData = useMemo(
    () =>
      cashFlowForecast.map((d) => ({
        ...d,
        timestamp: parseISO(d.date).getTime(),
      })),
    [cashFlowForecast],
  );

  const xDomain = useMemo((): [number, number] => {
    if (!chartData.length) {
      const now = todayTimestamp ?? 0;
      return [now - HALF_DAY_MS, now + HALF_DAY_MS];
    }
    return [
      chartData[0].timestamp - HALF_DAY_MS,
      chartData[chartData.length - 1].timestamp + HALF_DAY_MS,
    ];
  }, [chartData, todayTimestamp]);

  const yAxisWidth = useMemo(() => {
    const maxValue = Math.max(...cashFlowForecast.map((d) => d.cumulative), 0);
    const symbol = CurrenciesMap.get(preferredCurrencyCode)?.symbol ?? "";
    const formatted = `${symbol}${maxValue}`;
    return Math.max(45, Math.ceil(formatted.length * 7.5));
  }, [cashFlowForecast, preferredCurrencyCode]);

  const currencySymbol = CurrenciesMap.get(preferredCurrencyCode)?.symbol ?? "";

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
            amount={totalUpcomingMonth}
            currencyCode={preferredCurrencyCode}
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
          recharts={Recharts}
          className="h-full min-h-80 w-full md:min-h-72"
        >
          {Recharts ? (
            <Recharts.ComposedChart
              data={chartData}
              onClick={() => track("chart_cashflow_interacted")}
            >
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
              <Recharts.CartesianGrid
                vertical
                horizontal
                strokeDasharray="4 4"
                stroke="var(--border)"
              />
              <Recharts.XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={xDomain}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={10}
                tickFormatter={(val: number) => format(val, "dd", { locale })}
              />
              <Recharts.YAxis
                domain={[0, "auto"]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={yAxisWidth}
                className="text-muted-foreground font-mono text-[10px] font-medium"
                tickFormatter={(value: number) => `${currencySymbol}${value}`}
              />
              <Recharts.Tooltip
                cursor
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const item = payload[0].payload as {
                      date: string;
                      amount: number;
                      cumulative: number;
                      subscriptions: CashFlowSubscription[];
                    };
                    return (
                      <div className="bg-background/95 w-52 rounded-lg border p-3 shadow-md backdrop-blur-sm">
                        <p className="text-muted-foreground mb-2 text-xs font-medium">
                          {format(parseISO(item.date), "MMM dd, yyyy", {
                            locale,
                          })}
                        </p>
                        {item.subscriptions.length > 0 && (
                          <div className="mb-2 space-y-1.5">
                            {item.subscriptions.map((sub) => (
                              <div
                                key={`${sub.name}-${sub.brandDomain ?? "none"}-${sub.amount}`}
                                className="flex items-center gap-2"
                              >
                                <BrandfetchImage
                                  domain={sub.brandDomain}
                                  className="size-5 text-[8px]"
                                />
                                <span className="flex-1 truncate text-xs">
                                  {sub.name}
                                </span>
                                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                  <CurrencyText
                                    amount={sub.amount}
                                    currencyCode={preferredCurrencyCode}
                                  />
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="space-y-1 border-t pt-2">
                          {item.subscriptions.length > 1 && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs font-medium">
                                {m.analytics_charts_cashFlow_labels_dailyAmount()}
                              </span>
                              <CurrencyBadge
                                amount={item.amount}
                                currencyCode={preferredCurrencyCode}
                              />
                            </div>
                          )}
                          <div
                            className={`flex items-center justify-between gap-4 ${
                              item.subscriptions.length > 1
                                ? "mt-1 border-t pt-2"
                                : ""
                            }`}
                          >
                            <span className="text-xs font-bold">
                              {m.analytics_charts_cashFlow_labels_totalNeededLabel()}
                            </span>
                            <CurrencyBadge
                              amount={item.cumulative}
                              currencyCode={preferredCurrencyCode}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Recharts.Bar
                dataKey="amount"
                fill="var(--color-amount)"
                radius={[4, 4, 0, 0]}
                barSize={20}
                isAnimationActive={false}
              />
              <Recharts.Area
                type="monotone"
                dataKey="cumulative"
                fill="url(#fillCumulative)"
                fillOpacity={0.7}
                stroke="var(--color-cumulative)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                activeDot={{
                  r: 6,
                  fill: "var(--background)",
                  stroke: "var(--color-cumulative)",
                  strokeWidth: 2,
                }}
              />
              {todayTimestamp && (
                <Recharts.ReferenceLine
                  x={todayTimestamp}
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
            </Recharts.ComposedChart>
          ) : (
            <div className="h-full w-full" />
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
