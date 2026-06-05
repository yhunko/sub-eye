import type { MonthlySpendTrendPoint } from "@subeye/shared";
import { format, isSameMonth, subMonths } from "date-fns";
import type { LucideIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { CurrencyText } from "@/entities/currency";
import * as m from "@/i18n/messages";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { ChartContainer } from "@/shared/components/ui/chart";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/classes-utils";
import { useRechartsModule } from "./use-recharts-module";

type StatSummaryCardProps = {
  title: string;
  amount: number;
  currencyCode: string;
  isLoading?: boolean;
  trend?: MonthlySpendTrendPoint[];
  delta?: {
    label: string;
    tone: string;
    icon: LucideIcon;
  };
  secondaryInfo?: ReactNode;
  className?: string;
};

const chartConfig = {
  amount: {
    label: "Amount",
    color: "hsl(var(--primary))",
  },
};

export const StatSummaryCard: FC<StatSummaryCardProps> = ({
  title,
  amount,
  currencyCode,
  isLoading,
  trend,
  delta,
  secondaryInfo,
  className,
}) => {
  const Recharts = useRechartsModule();

  if (isLoading) {
    return (
      <Card className={cn("min-h-40", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="size-6 rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 flex-col space-y-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-15 w-25 shrink-0 rounded-lg md:w-60" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const DeltaIcon = delta?.icon;

  return (
    <Card className={cn("min-h-40", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
        {DeltaIcon && (
          <div className={cn("rounded-full p-1", delta?.tone)}>
            <DeltaIcon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-bold">
              <CurrencyText amount={amount} currencyCode={currencyCode} />
            </div>
            {delta && (
              <p className="text-muted-foreground text-xs">{delta.label}</p>
            )}
            {secondaryInfo && (
              <div className="mt-2 text-xs">{secondaryInfo}</div>
            )}
          </div>
          {trend && trend.length > 0 && Recharts && (
            <div className="h-15 w-25 text-xs md:w-60">
              <ChartContainer
                config={chartConfig}
                recharts={Recharts}
                className="aspect-auto h-full w-full"
              >
                <Recharts.AreaChart
                  data={trend}
                  margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="gradientTrend"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--primary)"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <Recharts.Tooltip
                    cursor={false}
                    position={{ y: -50 }}
                    wrapperStyle={{ zIndex: 50, overflow: "visible" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const dataPoint = payload[0]
                          .payload as MonthlySpendTrendPoint;
                        const date = new Date(dataPoint.date);
                        const now = new Date();
                        const isCurrentMonth = isSameMonth(date, now);
                        const isPreviousMonth = isSameMonth(
                          date,
                          subMonths(now, 1),
                        );

                        let label = format(date, "LLLL");
                        if (isCurrentMonth) {
                          label += ` (${m.analytics_monthlySpend_currentMonth()})`;
                        } else if (isPreviousMonth) {
                          label += ` (${m.analytics_monthlySpend_lastMonth()})`;
                        }

                        return (
                          <div className="bg-popover text-popover-foreground rounded-lg border px-2 py-1 text-[10px] shadow-sm">
                            <div className="flex flex-row items-center gap-1">
                              <span className="text-muted-foreground">
                                {label}
                              </span>
                              &bull;
                              <CurrencyText
                                amount={payload[0].value as number}
                                currencyCode={currencyCode}
                                className="text-xs"
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
                    stroke="var(--primary)"
                    fill="url(#gradientTrend)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "var(--background)",
                      stroke: "var(--primary)",
                      strokeWidth: 2,
                    }}
                  />
                </Recharts.AreaChart>
              </ChartContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
