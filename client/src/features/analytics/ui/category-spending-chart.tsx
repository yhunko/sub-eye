import { type FC, useMemo } from "react";
import type { CategorySpendingDto } from "shared";
import { CurrencyText } from "@/entities/currency";
import { BrandfetchImage } from "@/features/brandfetch";
import * as m from "@/i18n/messages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/shared/components/ui/chart";
import { cn } from "@/shared/lib/classes-utils";
import { useRechartsModule } from "./use-recharts-module";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
const GOLDEN_ANGLE = 137.508;

type CategorySpendingChartProps = {
  categorySpending: CategorySpendingDto[];
  preferredCurrencyCode: string;
  className?: string;
};

function getCategoryKey(item: CategorySpendingDto): string {
  return item.categoryId ?? "__uncategorized__";
}

function getCategoryLabel(item: CategorySpendingDto): string {
  return item.categoryId === null
    ? m.analytics_charts_categories_uncategorized()
    : item.name;
}

function normalizeHue(value: number): number {
  return ((value % 360) + 360) % 360;
}

function buildCategoryColorMap(
  categories: readonly CategorySpendingDto[],
): Map<string, string> {
  const colorByKey = new Map<string, string>();
  for (const [index, item] of categories.entries()) {
    const key = getCategoryKey(item);
    const hue = normalizeHue(16 + index * GOLDEN_ANGLE);
    const lightness = index % 2 === 0 ? 54 : 48;
    colorByKey.set(key, `hsl(${hue.toFixed(2)} 72% ${lightness}%)`);
  }

  return colorByKey;
}

function getCategoryColor(
  item: CategorySpendingDto,
  index: number,
  colorsByCategory: ReadonlyMap<string, string>,
): string {
  const color = colorsByCategory.get(getCategoryKey(item));
  return color ?? CHART_COLORS[index % CHART_COLORS.length];
}

export const CategorySpendingChart: FC<CategorySpendingChartProps> = ({
  categorySpending,
  preferredCurrencyCode,
  className,
}) => {
  const Recharts = useRechartsModule();

  const total = useMemo(
    () => categorySpending.reduce((sum, item) => sum + item.amount, 0),
    [categorySpending],
  );

  const colorsByCategory = useMemo(
    () => buildCategoryColorMap(categorySpending),
    [categorySpending],
  );

  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        categorySpending.map((item, index) => [
          getCategoryKey(item),
          {
            label: `${item.emoji} ${getCategoryLabel(item)}`,
            color: getCategoryColor(item, index, colorsByCategory),
          },
        ]),
      ),
    [categorySpending, colorsByCategory],
  );

  if (categorySpending.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{m.analytics_charts_categories_title()}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {m.analytics_charts_categories_noData()}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>{m.analytics_charts_categories_title()}</CardTitle>
        <CardDescription>
          {m.analytics_charts_categories_subtitle()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto h-48 w-full max-w-xs"
        >
          {Recharts ? (
            <Recharts.PieChart>
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as CategorySpendingDto;
                    const percentage = ((item.amount / total) * 100).toFixed(1);
                    const subscriptions = item.subscriptions ?? [];
                    return (
                      <div className="bg-background/95 min-w-40 rounded-lg border p-3 shadow-md backdrop-blur-sm">
                        <p className="mb-1.5 text-sm font-medium">
                          {item.emoji} {getCategoryLabel(item)}
                        </p>
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <span className="text-muted-foreground text-xs">
                            {percentage}%
                          </span>
                          <CurrencyText
                            amount={item.amount}
                            currencyCode={preferredCurrencyCode}
                            className="text-xs font-medium tabular-nums"
                          />
                        </div>
                        {subscriptions.length > 0 && (
                          <div className="border-border/70 max-h-40 space-y-1 overflow-y-auto border-t pt-2">
                            {subscriptions.map((subscription) => (
                              <div
                                key={subscription.id}
                                className="flex items-center gap-2"
                              >
                                <BrandfetchImage
                                  domain={subscription.brandDomain}
                                  className="size-5 text-[8px]"
                                  decorative
                                />
                                <span className="flex-1 truncate text-xs">
                                  {subscription.name}
                                </span>
                                <CurrencyText
                                  amount={subscription.monthlyCost}
                                  currencyCode={preferredCurrencyCode}
                                  className="text-muted-foreground text-xs tabular-nums"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Recharts.Pie
                data={categorySpending}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {categorySpending.map((item, index) => (
                  <Recharts.Cell
                    key={getCategoryKey(item)}
                    fill={getCategoryColor(item, index, colorsByCategory)}
                  />
                ))}
              </Recharts.Pie>
            </Recharts.PieChart>
          ) : (
            <div className="h-full w-full" />
          )}
        </ChartContainer>

        <div className="space-y-2">
          {categorySpending.map((item, index) => {
            const percentage = ((item.amount / total) * 100).toFixed(1);
            return (
              <div
                key={getCategoryKey(item)}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: getCategoryColor(
                        item,
                        index,
                        colorsByCategory,
                      ),
                    }}
                  />
                  <span className="truncate text-sm">
                    {item.emoji} {getCategoryLabel(item)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {percentage}%
                  </span>
                  <CurrencyText
                    amount={item.amount}
                    currencyCode={preferredCurrencyCode}
                    className="text-xs tabular-nums"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
