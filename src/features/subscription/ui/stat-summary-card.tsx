"use client";

import { ReactNode } from "react";
import { Area, AreaChart, XAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { cn } from "@/shared/lib";
import { Card, CardContent, Skeleton } from "@/shared/components";
import { ChartContainer, ChartTooltip } from "@/shared/components/ui/chart";
import { LucideIcon } from "lucide-react";
import { CurrencyText } from "@/features/currency";

interface StatSummaryCardProps {
  title: string;
  amount: number;
  currencyCode: string;
  isLoading?: boolean;
  trend?: { date: string; amount: number }[];
  delta?: {
    label: string;
    tone: string;
    icon: LucideIcon;
  };
  secondaryInfo?: ReactNode;
  chartColor?: string;
  tooltipDateFormat?: string;
  className?: string;
}

export const StatSummaryCard = ({
  title,
  amount,
  currencyCode,
  isLoading,
  trend,
  delta,
  secondaryInfo,
  chartColor = "var(--chart-2)",
  tooltipDateFormat = "LLLL yyyy",
  className,
}: StatSummaryCardProps) => {
  if (isLoading) {
    return (
      <Card
        className={cn("border-border/60 bg-card/70 overflow-hidden", className)}
      >
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const DeltaIcon = delta?.icon;
  const gradientId = `trend-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <Card
      className={cn(
        "border-border/60 bg-card/70 overflow-hidden px-1 py-0.5 md:py-1.5",
        className,
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {title}
            </p>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-semibold tracking-tight md:text-3xl">
                <CurrencyText amount={amount} currencyCode={currencyCode} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {delta && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold",
                    delta.tone,
                  )}
                >
                  {DeltaIcon && <DeltaIcon className="size-3.5" />}
                  {delta.label}
                </span>
              )}
              {secondaryInfo}
            </div>
          </div>
        </div>

        {trend && trend.length > 0 && (
          <div className="mt-4 h-20">
            <ChartContainer
              config={{
                amount: {
                  label: title,
                  color: chartColor,
                },
              }}
              className="h-full w-full"
            >
              <AreaChart
                data={trend}
                margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-amount)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-amount)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide={true} />
                <ChartTooltip
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="border-border/60 bg-background/95 rounded-md border px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
                        <p className="text-muted-foreground">
                          {format(parseISO(item.date), tooltipDateFormat)}
                        </p>
                        <div className="text-foreground font-semibold">
                          <CurrencyText
                            amount={item.amount}
                            currencyCode={currencyCode}
                          />
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-amount)"
                  strokeWidth={1.5}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "var(--background)",
                    stroke: "var(--color-amount)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
