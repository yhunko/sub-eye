import type { RefObject, TouchEvent } from "react";
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isSameMonth, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, List, MoveHorizontal } from "lucide-react";
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m as motion,
  useReducedMotion,
} from "motion/react";
import { useWebHaptics } from "web-haptics/react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ChartContainer, ChartTooltip } from "@/shared/components/ui/chart";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import { CurrencyBadge, CurrencyText } from "@/entities/currency";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import { BrandfetchImage } from "@/features/brandfetch";
import type { MonthlyTrendPoint } from "shared";
import type { MonthlySpendingTrendVariantProps } from "./monthly-spending-trend-chart.types";
import { useRechartsModule } from "./use-recharts-module";

type TrendChartInteractionState = {
  activeTooltipIndex?: number | string | null;
  activeIndex?: number | string | null;
  activeLabel?: string | number;
};

const HORIZONTAL_SWIPE_MIN_DISTANCE = 44;
const HORIZONTAL_SWIPE_DOMINANCE_RATIO = 1.2;
const SWIPE_HINT_VISIBLE_MS = 3800;

type SelectedMonthSummaryProps = {
  selectedMonth: MonthlyTrendPoint;
  preferredCurrencyCode: string;
  locale: MonthlySpendingTrendVariantProps["locale"];
  onOpenDetails: () => void;
};

const SelectedMonthSummary: FC<SelectedMonthSummaryProps> = ({
  selectedMonth,
  preferredCurrencyCode,
  locale,
  onOpenDetails,
}) => {
  return (
    <div className="bg-muted/25 border-border mb-3 flex items-center justify-between gap-2 rounded-xl border p-2.5">
      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px]">
          {format(parseISO(selectedMonth.date), "LLLL yyyy", { locale })}
        </p>
        <div className="text-foreground text-sm font-semibold tabular-nums">
          <CurrencyText
            amount={selectedMonth.amount}
            currencyCode={preferredCurrencyCode}
          />
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="rounded-full px-3"
        onClick={onOpenDetails}
      >
        <List className="size-4" />
        <span>{m.common_subscriptions()}</span>
        <Badge variant="outline" className="rounded-full px-1.5">
          {selectedMonth.subscriptions?.length ?? 0}
        </Badge>
      </Button>
    </div>
  );
};

type TrendLineChartProps = {
  monthlyTrend: MonthlyTrendPoint[];
  locale: MonthlySpendingTrendVariantProps["locale"];
  currencySymbol: string;
  yAxisWidth: number;
  onActiveMonthChange: (payload: { date?: string } | undefined) => void;
};

const TrendLineChart: FC<TrendLineChartProps> = ({
  monthlyTrend,
  locale,
  currencySymbol,
  yAxisWidth,
  onActiveMonthChange,
}) => {
  const Recharts = useRechartsModule();

  const resolveActiveMonth = (state: TrendChartInteractionState) => {
    const activeIndexValue = state.activeTooltipIndex ?? state.activeIndex;
    const numericIndex =
      typeof activeIndexValue === "number"
        ? activeIndexValue
        : typeof activeIndexValue === "string"
          ? Number(activeIndexValue)
          : Number.NaN;

    if (
      Number.isInteger(numericIndex) &&
      numericIndex >= 0 &&
      numericIndex < monthlyTrend.length
    ) {
      return monthlyTrend[numericIndex];
    }

    if (typeof state.activeLabel === "string") {
      return monthlyTrend.find((month) => month.date === state.activeLabel);
    }

    return undefined;
  };

  const handleInteraction = (state: TrendChartInteractionState) => {
    const activeMonth = resolveActiveMonth(state);

    if (!activeMonth) {
      onActiveMonthChange(undefined);
      return;
    }

    onActiveMonthChange(activeMonth);
  };

  return (
    <ChartContainer
      config={{
        amount: {
          label: m.analytics_charts_monthlySpending_labels_totalSpending(),
          color: "var(--chart-1)",
        },
      }}
      className="aspect-auto h-64 w-full sm:h-72"
    >
      {Recharts ? (
        <Recharts.AreaChart
          data={monthlyTrend}
          margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
          onMouseMove={handleInteraction}
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
            content={() => null}
          />
          <Recharts.Area
            type="monotone"
            dataKey="amount"
            stroke="var(--color-amount)"
            strokeWidth={2}
            fill="url(#fillAmount)"
            fillOpacity={0.7}
            dot={false}
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

type DrawerMonthNavigatorProps = {
  monthlyTrend: MonthlyTrendPoint[];
  selectedMonth: MonthlyTrendPoint;
  selectedMonthIndex: number;
  canGoPreviousMonth: boolean;
  canGoNextMonth: boolean;
  onSelectMonthByIndex: (index: number) => void;
  monthChipRefs: RefObject<Array<HTMLButtonElement | null>>;
  locale: MonthlySpendingTrendVariantProps["locale"];
};

const DrawerMonthNavigator: FC<DrawerMonthNavigatorProps> = ({
  monthlyTrend,
  selectedMonth,
  selectedMonthIndex,
  canGoPreviousMonth,
  canGoNextMonth,
  onSelectMonthByIndex,
  monthChipRefs,
  locale,
}) => {
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

type DrawerSubscriptionsContentProps = {
  isOpen: boolean;
  swipeHintSession: number;
  selectedMonth: MonthlyTrendPoint;
  preferredCurrencyCode: string;
  selectedMonthIndex: number;
  monthlyTrend: MonthlyTrendPoint[];
  canGoPreviousMonth: boolean;
  canGoNextMonth: boolean;
  onSelectMonthByIndex: (index: number) => void;
  monthChipRefs: RefObject<Array<HTMLButtonElement | null>>;
  locale: MonthlySpendingTrendVariantProps["locale"];
};

type MonthTransitionDirection = 1 | -1;

const monthDeckVariants = {
  enter: (direction: MonthTransitionDirection = 1) => ({
    opacity: 0,
    x: direction > 0 ? 26 : -26,
    filter: "blur(7px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
  },
  exit: (direction: MonthTransitionDirection = 1) => ({
    opacity: 0,
    x: direction > 0 ? -26 : 26,
    filter: "blur(8px)",
  }),
};

const DrawerSubscriptionsContent: FC<DrawerSubscriptionsContentProps> = ({
  isOpen,
  swipeHintSession,
  selectedMonth,
  preferredCurrencyCode,
  selectedMonthIndex,
  monthlyTrend,
  canGoPreviousMonth,
  canGoNextMonth,
  onSelectMonthByIndex,
  monthChipRefs,
  locale,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const subscriptionsListRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{
    x: number;
    y: number;
    skipSwipe: boolean;
  } | null>(null);
  const [dismissedSwipeHintSession, setDismissedSwipeHintSession] = useState<
    number | null
  >(null);
  const [monthTransitionDirection, setMonthTransitionDirection] =
    useState<MonthTransitionDirection>(1);
  const isSwipeHintVisible =
    isOpen &&
    monthlyTrend.length > 1 &&
    dismissedSwipeHintSession !== swipeHintSession;
  const dismissSwipeHintForCurrentSession = useCallback(() => {
    setDismissedSwipeHintSession((currentSession) =>
      currentSession === swipeHintSession ? currentSession : swipeHintSession,
    );
  }, [swipeHintSession]);

  useEffect(() => {
    if (subscriptionsListRef.current) {
      subscriptionsListRef.current.scrollTop = 0;
    }
  }, [selectedMonth.date]);

  useEffect(() => {
    if (!isSwipeHintVisible) {
      return;
    }

    const timerId = window.setTimeout(() => {
      dismissSwipeHintForCurrentSession();
    }, SWIPE_HINT_VISIBLE_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [dismissSwipeHintForCurrentSession, isSwipeHintVisible, swipeHintSession]);

  const shouldSkipSwipe = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest("button, a, input, textarea, select, [role='button']"),
    );
  };

  const handleDrawerBodyTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      skipSwipe: shouldSkipSwipe(event.target),
    };
  };

  const handleDrawerBodyTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start || start.skipSwipe) {
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isHorizontalSwipe =
      Math.abs(deltaX) >= HORIZONTAL_SWIPE_MIN_DISTANCE &&
      Math.abs(deltaX) > Math.abs(deltaY) * HORIZONTAL_SWIPE_DOMINANCE_RATIO;

    if (!isHorizontalSwipe) {
      return;
    }

    dismissSwipeHintForCurrentSession();

    if (deltaX < 0 && canGoNextMonth) {
      selectMonthWithTransition(selectedMonthIndex + 1);
      return;
    }

    if (deltaX > 0 && canGoPreviousMonth) {
      selectMonthWithTransition(selectedMonthIndex - 1);
    }
  };

  const handleDrawerBodyTouchCancel = () => {
    touchStartRef.current = null;
  };

  const selectMonthWithTransition = (index: number) => {
    if (index === selectedMonthIndex) {
      return;
    }

    setMonthTransitionDirection(index > selectedMonthIndex ? 1 : -1);
    onSelectMonthByIndex(index);
  };

  return (
    <DrawerContent className="z-70 h-[80vh]">
      <DrawerHeader className="text-left">
        <DrawerTitle>{m.common_subscriptions()}</DrawerTitle>
        <DrawerDescription>
          {m.analytics_charts_monthlySpending_labels_totalSpending()}
        </DrawerDescription>
      </DrawerHeader>
      <div
        className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-x-hidden overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
        onTouchStart={handleDrawerBodyTouchStart}
        onTouchEnd={handleDrawerBodyTouchEnd}
        onTouchCancel={handleDrawerBodyTouchCancel}
      >
        <div className="space-y-3 pb-3">
          <DrawerMonthNavigator
            monthlyTrend={monthlyTrend}
            selectedMonth={selectedMonth}
            selectedMonthIndex={selectedMonthIndex}
            canGoPreviousMonth={canGoPreviousMonth}
            canGoNextMonth={canGoNextMonth}
            onSelectMonthByIndex={selectMonthWithTransition}
            monthChipRefs={monthChipRefs}
            locale={locale}
          />
          <LazyMotion features={domAnimation}>
            <AnimatePresence initial={false}>
              {isSwipeHintVisible ? (
                <motion.div
                  key="swipe-hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="border-primary/15 from-primary/8 to-primary/4 text-muted-foreground flex items-center justify-center gap-1.5 rounded-full border bg-linear-to-r px-3 py-1.5 text-[11px]"
                >
                  <span className="inline-flex items-center">
                    <MoveHorizontal className="size-3.5" aria-hidden="true" />
                  </span>
                  <span>{m.analytics_charts_monthlySpending_swipeHint()}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </LazyMotion>

          <div className="border-border flex items-center justify-between border-b pb-3">
            <span className="text-sm font-semibold">
              {m.analytics_charts_monthlySpending_labels_total()}
            </span>
            <CurrencyBadge
              amount={selectedMonth.amount}
              currencyCode={preferredCurrencyCode}
            />
          </div>
        </div>

        <div
          ref={subscriptionsListRef}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          <LazyMotion features={domAnimation}>
            <AnimatePresence
              mode="wait"
              initial={false}
              custom={monthTransitionDirection}
            >
              <motion.div
                key={selectedMonth.date}
                custom={monthTransitionDirection}
                variants={monthDeckVariants}
                initial={shouldReduceMotion ? false : "enter"}
                animate="center"
                exit={shouldReduceMotion ? undefined : "exit"}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="pb-1"
              >
                {selectedMonth.subscriptions &&
                selectedMonth.subscriptions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedMonth.subscriptions.map((sub) => (
                      <div
                        key={`${sub.name}-${sub.brandDomain}-${sub.currencyCode}-${sub.amount}`}
                        className="bg-muted/30 flex items-center gap-2 rounded-md p-2"
                      >
                        <BrandfetchImage
                          domain={sub.brandDomain}
                          className="size-6 text-[8px]"
                        />
                        <span className="flex-1 truncate text-sm">
                          {sub.name}
                        </span>
                        <div className="text-muted-foreground shrink-0 text-sm tabular-nums">
                          <CurrencyText
                            amount={sub.amount}
                            currencyCode={sub.currencyCode}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-2 text-sm">
                    {m.analytics_monthlySpend_noData()}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </LazyMotion>
        </div>
      </div>
    </DrawerContent>
  );
};

const MonthlySpendingTrendChartMobile: FC<MonthlySpendingTrendVariantProps> = ({
  monthlyTrend,
  preferredCurrencyCode,
  currencySymbol,
  yAxisWidth,
  locale,
}) => {
  const haptics = useWebHaptics();
  const [selectedMonthDate, setSelectedMonthDate] = useState<string | null>(
    null,
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [swipeHintSession, setSwipeHintSession] = useState(0);
  const monthChipRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedMonthIndex = useMemo(() => {
    if (!monthlyTrend.length) {
      return -1;
    }

    if (!selectedMonthDate) {
      const currentMonthIndex = monthlyTrend.findIndex((month) =>
        isSameMonth(parseISO(month.date), new Date()),
      );
      return currentMonthIndex >= 0
        ? currentMonthIndex
        : monthlyTrend.length - 1;
    }

    const monthIndex = monthlyTrend.findIndex(
      (month) => month.date === selectedMonthDate,
    );

    return monthIndex >= 0 ? monthIndex : monthlyTrend.length - 1;
  }, [monthlyTrend, selectedMonthDate]);

  const selectedMonth =
    selectedMonthIndex >= 0 ? monthlyTrend[selectedMonthIndex] : null;
  const canGoPreviousMonth = selectedMonthIndex > 0;
  const canGoNextMonth =
    selectedMonthIndex >= 0 && selectedMonthIndex < monthlyTrend.length - 1;

  const selectMonthByIndex = (index: number) => {
    const month = monthlyTrend[index];
    if (month && month.date !== selectedMonthDate) {
      haptics.trigger("selection");
      setSelectedMonthDate(month.date);
    }
  };

  const handleActiveMonthChange = (payload: { date?: string } | undefined) => {
    if (isDetailsOpen) {
      return;
    }

    const nextDate = payload?.date;
    if (nextDate) {
      setSelectedMonthDate((currentDate) =>
        currentDate === nextDate ? currentDate : nextDate,
      );
    }
  };

  useEffect(() => {
    if (!isDetailsOpen || selectedMonthIndex < 0) {
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
  }, [isDetailsOpen, selectedMonthIndex]);

  const handleOpenDetails = () => {
    setSwipeHintSession((value) => value + 1);
    setIsDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setIsDetailsOpen((currentOpen) => {
      if (!currentOpen && open) {
        haptics.trigger("medium");
        setSwipeHintSession((value) => value + 1);
      }
      return open;
    });
  };

  return (
    <Drawer
      open={isDetailsOpen}
      onOpenChange={handleDetailsOpenChange}
      shouldScaleBackground={false}
      dismissible={true}
      repositionInputs={false}
    >
      {selectedMonth && (
        <SelectedMonthSummary
          selectedMonth={selectedMonth}
          preferredCurrencyCode={preferredCurrencyCode}
          locale={locale}
          onOpenDetails={handleOpenDetails}
        />
      )}

      <TrendLineChart
        monthlyTrend={monthlyTrend}
        locale={locale}
        currencySymbol={currencySymbol}
        yAxisWidth={yAxisWidth}
        onActiveMonthChange={handleActiveMonthChange}
      />

      {selectedMonth && (
        <DrawerSubscriptionsContent
          isOpen={isDetailsOpen}
          swipeHintSession={swipeHintSession}
          selectedMonth={selectedMonth}
          preferredCurrencyCode={preferredCurrencyCode}
          selectedMonthIndex={selectedMonthIndex}
          monthlyTrend={monthlyTrend}
          canGoPreviousMonth={canGoPreviousMonth}
          canGoNextMonth={canGoNextMonth}
          onSelectMonthByIndex={selectMonthByIndex}
          monthChipRefs={monthChipRefs}
          locale={locale}
        />
      )}
    </Drawer>
  );
};

export default MonthlySpendingTrendChartMobile;
