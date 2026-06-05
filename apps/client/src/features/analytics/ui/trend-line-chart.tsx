import type { MonthlyTrendPoint } from "@subeye/shared";
import type { Locale } from "date-fns";
import { format, parseISO } from "date-fns";
import type { FC } from "react";
import * as m from "@/i18n/messages";
import { ChartContainer } from "@/shared/components/ui/chart";
import { useRechartsModule } from "./use-recharts-module";

type TrendChartInteractionState = {
  activeTooltipIndex?: number | string | null;
  activeLabel?: string | number;
};

type TrendLineChartProps = {
  monthlyTrend: MonthlyTrendPoint[];
  selectedMonth: MonthlyTrendPoint | null;
  locale: Locale;
  currencySymbol: string;
  yAxisWidth: number;
  onActiveMonthChange: (month: MonthlyTrendPoint | undefined) => void;
};

export const resolveActiveMonth = (
  monthlyTrend: MonthlyTrendPoint[],
  state: TrendChartInteractionState,
) => {
  if (
    typeof state.activeTooltipIndex === "number" &&
    Number.isInteger(state.activeTooltipIndex) &&
    state.activeTooltipIndex >= 0 &&
    state.activeTooltipIndex < monthlyTrend.length
  ) {
    return monthlyTrend[state.activeTooltipIndex];
  }

  if (typeof state.activeLabel === "string") {
    return monthlyTrend.find((month) => month.date === state.activeLabel);
  }

  return undefined;
};

export const TrendLineChart: FC<TrendLineChartProps> = ({
  monthlyTrend,
  selectedMonth,
  locale,
  currencySymbol,
  yAxisWidth,
  onActiveMonthChange,
}) => {
  const Recharts = useRechartsModule();

  const handleInteraction = (state: TrendChartInteractionState) => {
    onActiveMonthChange(resolveActiveMonth(monthlyTrend, state));
  };

  return (
    <ChartContainer
      config={{
        amount: {
          label: m.analytics_charts_monthlySpending_labels_totalSpending(),
          color: "var(--chart-1)",
        },
      }}
      recharts={Recharts}
      className="aspect-auto h-64 w-full [-webkit-tap-highlight-color:transparent] sm:h-72"
    >
      {Recharts ? (
        <Recharts.AreaChart
          data={monthlyTrend}
          margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
          accessibilityLayer={false}
          onMouseMove={handleInteraction}
          onTouchMove={handleInteraction}
          onClick={handleInteraction}
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
            tickFormatter={(value: string) =>
              format(parseISO(value), "LLL yyyy", { locale })
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
          <Recharts.Tooltip cursor={false} content={() => null} />
          {selectedMonth && (
            <Recharts.ReferenceDot
              x={selectedMonth.date}
              y={selectedMonth.amount}
              r={6}
              fill="var(--background)"
              stroke="var(--color-amount)"
              strokeWidth={2}
            />
          )}
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
