import type { MonthlyTrendPoint } from "@subeye/shared";
import { Link } from "@tanstack/react-router";
import type { Locale } from "date-fns";
import { ChevronRight, MoveHorizontal } from "lucide-react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m as motion,
  useReducedMotion,
} from "motion/react";
import type { FC, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { BrandfetchImage } from "@/entities/brandfetch";
import { CurrencyBadge, CurrencyText } from "@/entities/currency";
import * as m from "@/i18n/messages";
import {
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import { cn } from "@/shared/lib/classes-utils";
import { DrawerMonthNavigator } from "./drawer-month-navigator";
import { useHorizontalSwipe } from "./use-horizontal-swipe";

type DrawerSubscriptionsContentProps = {
  selectedMonth: MonthlyTrendPoint;
  preferredCurrencyCode: string;
  selectedMonthIndex: number;
  monthlyTrend: MonthlyTrendPoint[];
  canGoPreviousMonth: boolean;
  canGoNextMonth: boolean;
  onSelectMonthByIndex: (index: number, source?: "swipe" | "direct") => void;
  onOpenSubscriptionOverview: (
    subscriptionId: string,
    monthDate: string,
  ) => void;
  locale: Locale;
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

export const DrawerSubscriptionsContent: FC<
  DrawerSubscriptionsContentProps
> = ({
  selectedMonth,
  preferredCurrencyCode,
  selectedMonthIndex,
  monthlyTrend,
  canGoPreviousMonth,
  canGoNextMonth,
  onSelectMonthByIndex,
  onOpenSubscriptionOverview,
  locale,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const subscriptionsListRef = useRef<HTMLDivElement | null>(null);
  const [monthTransitionDirection, setMonthTransitionDirection] =
    useState<MonthTransitionDirection>(1);

  useEffect(() => {
    void selectedMonthIndex;

    if (subscriptionsListRef.current) {
      subscriptionsListRef.current.scrollTop = 0;
    }
  }, [selectedMonthIndex]);

  const selectMonthWithTransition = (index: number) => {
    if (index === selectedMonthIndex) {
      return;
    }

    setMonthTransitionDirection(index > selectedMonthIndex ? 1 : -1);
    onSelectMonthByIndex(index, "swipe");
  };

  const swipeHandlers = useHorizontalSwipe({
    onSwipeLeft: () => {
      if (canGoNextMonth) {
        selectMonthWithTransition(selectedMonthIndex + 1);
      }
    },
    onSwipeRight: () => {
      if (canGoPreviousMonth) {
        selectMonthWithTransition(selectedMonthIndex - 1);
      }
    },
  });

  const handleSubscriptionRowClick = (
    event: MouseEvent<HTMLAnchorElement>,
    subscriptionId: string,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    onOpenSubscriptionOverview(subscriptionId, selectedMonth.date);
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
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchEnd={swipeHandlers.onTouchEnd}
        onTouchCancel={swipeHandlers.onTouchCancel}
      >
        <div className="space-y-3 pb-3">
          <DrawerMonthNavigator
            monthlyTrend={monthlyTrend}
            selectedMonth={selectedMonth}
            selectedMonthIndex={selectedMonthIndex}
            canGoPreviousMonth={canGoPreviousMonth}
            canGoNextMonth={canGoNextMonth}
            onSelectMonthByIndex={selectMonthWithTransition}
            locale={locale}
          />
          <div
            className={cn(
              "flex h-6 items-center justify-center gap-1.5 text-[11px]",
              monthlyTrend.length > 1
                ? "text-muted-foreground/65"
                : "text-transparent",
            )}
            aria-hidden={monthlyTrend.length <= 1}
          >
            <span className="inline-flex items-center">
              <MoveHorizontal className="size-3.5" aria-hidden="true" />
            </span>
            <span>{m.analytics_charts_monthlySpending_swipeHint()}</span>
          </div>

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
                      <Link
                        key={sub.id}
                        to="/subscriptions/$id"
                        preload={false}
                        params={{ id: sub.id }}
                        search={{
                          from: "/",
                          monthlyTrendOpen: true,
                          monthlyTrendMonth: selectedMonth.date,
                        }}
                        onClick={(event) =>
                          handleSubscriptionRowClick(event, sub.id)
                        }
                        className="bg-muted/30 border-border/70 active:bg-muted/55 focus-visible:ring-ring/60 group flex items-center gap-2 rounded-md border p-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
                        <ChevronRight
                          className="text-muted-foreground/80 size-4 shrink-0 transition-transform group-active:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
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
