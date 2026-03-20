import { FC, useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Drawer } from "@/shared/components/ui/drawer";
import { useWebHaptics } from "web-haptics/react";
import type { MonthlySpendingTrendVariantProps } from "./monthly-spending-trend-chart.types";
import { DrawerSubscriptionsContent } from "./drawer-subscriptions-content";
import { track } from "@/shared/lib/analytics";
import { resolveSelectedMonthIndex } from "./monthly-spending-trend-mobile.utils";
import { SelectedMonthSummary } from "./selected-month-summary";
import { TrendLineChart } from "./trend-line-chart";

const DASHBOARD_ROUTE = "/(protected)/";
const DASHBOARD_PATH = "/";

const MonthlySpendingTrendChartMobile: FC<MonthlySpendingTrendVariantProps> = ({
  monthlyTrend,
  preferredCurrencyCode,
  currencySymbol,
  yAxisWidth,
  locale,
}) => {
  const haptics = useWebHaptics();
  const navigate = useNavigate();
  const { monthlyTrendOpen, monthlyTrendMonth } = useSearch({
    from: DASHBOARD_ROUTE,
  });

  const selectedMonthIndex = useMemo(
    () => resolveSelectedMonthIndex(monthlyTrend, monthlyTrendMonth),
    [monthlyTrend, monthlyTrendMonth],
  );
  const selectedMonth =
    selectedMonthIndex >= 0 ? monthlyTrend[selectedMonthIndex] : null;

  const updateSearch = useCallback(
    (patch: { monthlyTrendOpen?: boolean; monthlyTrendMonth?: string }) => {
      void navigate({
        to: DASHBOARD_PATH,
        search: {
          monthlyTrendOpen:
            patch.monthlyTrendOpen !== undefined
              ? patch.monthlyTrendOpen
              : monthlyTrendOpen,
          monthlyTrendMonth:
            patch.monthlyTrendMonth !== undefined
              ? patch.monthlyTrendMonth
              : monthlyTrendMonth,
        },
        replace: true,
        resetScroll: false,
      });
    },
    [monthlyTrendMonth, monthlyTrendOpen, navigate],
  );

  const selectMonthByIndex = useCallback(
    (index: number, source: "swipe" | "direct" = "direct") => {
      const month = monthlyTrend[index];
      if (!month || month.date === selectedMonth?.date) return;
      haptics.trigger(source === "swipe" ? "medium" : "selection");
      updateSearch({ monthlyTrendMonth: month.date });
    },
    [haptics, monthlyTrend, selectedMonth?.date, updateSearch],
  );

  const handleActiveMonthChange = useCallback(
    (month: { date?: string } | undefined) => {
      if (
        monthlyTrendOpen === true ||
        !month?.date ||
        month.date === selectedMonth?.date
      )
        return;
      updateSearch({ monthlyTrendMonth: month.date });
    },
    [monthlyTrendOpen, selectedMonth?.date, updateSearch],
  );

  const handleDetailsOpenChange = (open: boolean) => {
    if (open && monthlyTrendOpen !== true) {
      haptics.trigger("medium");
      if (selectedMonth) {
        track("chart_spending_trend_month_drilldown", {
          month: format(parseISO(selectedMonth.date), "yyyy-MM"),
        });
      }
    }

    if (!open) {
      void navigate({
        to: DASHBOARD_PATH,
        search: (previousSearch) => ({
          ...previousSearch,
          monthlyTrendOpen: undefined,
        }),
        replace: true,
        resetScroll: false,
      });
      return;
    }

    updateSearch({ monthlyTrendOpen: true });
  };

  const handleOpenSubscriptionOverview = (
    subscriptionId: string,
    monthDate: string,
  ) => {
    haptics.trigger("light");
    void navigate({
      to: "/subscriptions/$id",
      params: { id: subscriptionId },
      search: {
        from: "/",
        monthlyTrendOpen: true,
        monthlyTrendMonth: monthDate,
      },
      viewTransition: true,
    });
  };

  return (
    <Drawer
      open={monthlyTrendOpen === true}
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
          onOpenDetails={() => handleDetailsOpenChange(true)}
        />
      )}
      <TrendLineChart
        monthlyTrend={monthlyTrend}
        selectedMonth={selectedMonth}
        locale={locale}
        currencySymbol={currencySymbol}
        yAxisWidth={yAxisWidth}
        onActiveMonthChange={handleActiveMonthChange}
      />
      {selectedMonth && (
        <DrawerSubscriptionsContent
          selectedMonth={selectedMonth}
          preferredCurrencyCode={preferredCurrencyCode}
          selectedMonthIndex={selectedMonthIndex}
          monthlyTrend={monthlyTrend}
          canGoPreviousMonth={selectedMonthIndex > 0}
          canGoNextMonth={selectedMonthIndex < monthlyTrend.length - 1}
          onSelectMonthByIndex={selectMonthByIndex}
          onOpenSubscriptionOverview={handleOpenSubscriptionOverview}
          locale={locale}
        />
      )}
    </Drawer>
  );
};

export default MonthlySpendingTrendChartMobile;
