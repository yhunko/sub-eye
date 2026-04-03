import type { Locale } from "date-fns";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FC } from "react";
import { useEffect, useRef } from "react";
import type { MonthlyTrendPoint } from "shared";
import * as m from "@/i18n/messages";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/classes-utils";

type DrawerMonthNavigatorProps = {
  monthlyTrend: MonthlyTrendPoint[];
  selectedMonth: MonthlyTrendPoint;
  selectedMonthIndex: number;
  canGoPreviousMonth: boolean;
  canGoNextMonth: boolean;
  onSelectMonthByIndex: (index: number) => void;
  locale: Locale;
};

export const DrawerMonthNavigator: FC<DrawerMonthNavigatorProps> = ({
  monthlyTrend,
  selectedMonth,
  selectedMonthIndex,
  canGoPreviousMonth,
  canGoNextMonth,
  onSelectMonthByIndex,
  locale,
}) => {
  const monthChipRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (selectedMonthIndex < 0) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      monthChipRefs.current[selectedMonthIndex]?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [selectedMonthIndex]);

  return (
    <div className="bg-muted/30 border-border rounded-xl border p-2">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="shrink-0 rounded-full"
          aria-label={m.analytics_charts_monthlySpending_actions_previousMonth()}
          disabled={!canGoPreviousMonth}
          onClick={() => onSelectMonthByIndex(selectedMonthIndex - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold">
            {format(parseISO(selectedMonth.date), "LLLL yyyy", { locale })}
          </p>
          <p className="text-muted-foreground text-xs">
            {selectedMonthIndex + 1} / {monthlyTrend.length}
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="shrink-0 rounded-full"
          aria-label={m.analytics_charts_monthlySpending_actions_nextMonth()}
          disabled={!canGoNextMonth}
          onClick={() => onSelectMonthByIndex(selectedMonthIndex + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-3">
        {monthlyTrend.map((month, index) => (
          <button
            key={month.date}
            type="button"
            ref={(node) => {
              monthChipRefs.current[index] = node;
            }}
            className={cn(
              "border-border bg-background shrink-0 rounded-full border px-2 py-1 text-xs",
              index === selectedMonthIndex &&
                "bg-primary text-primary-foreground border-primary",
            )}
            onClick={() => onSelectMonthByIndex(index)}
          >
            {format(parseISO(month.date), "LLL", { locale })}
          </button>
        ))}
      </div>
    </div>
  );
};
