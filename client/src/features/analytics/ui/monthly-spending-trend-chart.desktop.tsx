import { format, parseISO } from "date-fns";
import type { FC } from "react";
import type { MonthlyTrendSubscription } from "shared";
import { BrandfetchImage } from "@/entities/brandfetch";
import { CurrencyBadge, CurrencyText } from "@/entities/currency";
import * as m from "@/i18n/messages";
import { ChartContainer, ChartTooltip } from "@/shared/components/ui/chart";
import { cn } from "@/shared/lib/classes-utils";
import type { MonthlySpendingTrendVariantProps } from "./monthly-spending-trend-chart.types";
import { useRechartsModule } from "./use-recharts-module";

const MonthlySpendingTrendChartDesktop: FC<
  MonthlySpendingTrendVariantProps
> = ({
  monthlyTrend,
  preferredCurrencyCode,
  currencySymbol,
  yAxisWidth,
  locale,
}) => {
  const Recharts = useRechartsModule();

  return (
    <ChartContainer
      config={{
        amount: {
          label: m.analytics_charts_monthlySpending_labels_totalSpending(),
          color: "var(--chart-1)",
        },
      }}
      className="h-full min-h-[18rem] w-full"
    >
      {Recharts ? (
        <Recharts.AreaChart
          data={monthlyTrend}
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
          <Recharts.CartesianGrid
            vertical
            horizontal
            strokeDasharray="4 4"
            stroke="var(--border)"
          />
          <Recharts.XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={(val: string) =>
              format(parseISO(val), "LLL yyyy", { locale })
            }
            className="text-muted-foreground text-xs"
          />
          <Recharts.YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={yAxisWidth}
            className="text-muted-foreground font-mono text-[10px] font-medium"
            tickFormatter={(value: number) =>
              `${currencySymbol}${value.toLocaleString(undefined, {
                notation: "compact",
                maximumFractionDigits: 1,
              })}`
            }
          />
          <ChartTooltip
            cursor={{
              stroke: "var(--border)",
              strokeWidth: 1,
              strokeDasharray: "0",
            }}
            content={({ active, payload }) => {
              if (active && payload?.length) {
                const item = payload[0].payload as {
                  date: string;
                  amount: number;
                  subscriptions: MonthlyTrendSubscription[];
                };

                return (
                  <div className="bg-background/95 border-border max-h-75 w-52 overflow-y-auto rounded-lg border p-3 shadow-md backdrop-blur-sm">
                    <p className="text-muted-foreground mb-2 text-xs font-medium">
                      {format(parseISO(item.date), "LLLL yyyy", { locale })}
                    </p>
                    {item.subscriptions && item.subscriptions.length > 0 && (
                      <div className="mb-2 space-y-1.5">
                        {item.subscriptions.map((sub) => (
                          <div
                            key={`${sub.name}-${sub.brandDomain}-${sub.currencyCode}-${sub.amount}`}
                            className="flex items-center gap-2"
                          >
                            <BrandfetchImage
                              domain={sub.brandDomain}
                              className="size-5 text-[8px]"
                            />
                            <span className="flex-1 truncate text-xs">
                              {sub.name}
                            </span>
                            <div className="text-muted-foreground shrink-0 text-xs tabular-nums">
                              <CurrencyText
                                amount={sub.amount}
                                currencyCode={sub.currencyCode}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex items-center justify-between gap-4",
                        item.subscriptions &&
                          item.subscriptions.length > 0 &&
                          "border-t pt-2",
                      )}
                    >
                      <span className="text-foreground text-sm font-bold">
                        {m.analytics_charts_monthlySpending_labels_total()}
                      </span>
                      <CurrencyBadge
                        amount={item.amount}
                        currencyCode={preferredCurrencyCode}
                      />
                    </div>
                  </div>
                );
              }

              return null;
            }}
          />
          <Recharts.Area
            type="monotone"
            dataKey="amount"
            stroke="var(--color-amount)"
            strokeWidth={2}
            fill="url(#fillAmount)"
            fillOpacity={0.7}
            dot={false}
            isAnimationActive={false}
            activeDot={{
              r: 6,
              fill: "var(--background)",
              stroke: "var(--color-amount)",
              strokeWidth: 2,
            }}
          />
        </Recharts.AreaChart>
      ) : (
        <div className="h-full w-full" />
      )}
    </ChartContainer>
  );
};

export default MonthlySpendingTrendChartDesktop;
