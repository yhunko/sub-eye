import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { dashboardAnalyticsQuery } from "@/entities/analytics";
import {
  AnalyticsWidget,
  CashFlowChart,
  CategorySpendingChart,
  EmptyDashboard,
  MonthlySpendingTrendChart,
  StatCards,
  UpcomingRenewals,
} from "@/features/analytics";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useActiveSpace } from "@/shared/lib/org/use-active-space";
import { dashboardSearchSchema } from "@/shared/lib/router/dashboard-search";
import { DashboardLayout, DashboardNavbar } from "@/widgets/dashboard-layout";

const STAT_CARD_SKELETONS = [0, 1, 2, 3] as const;

export const Route = createFileRoute("/(protected)/")({
  loader: ({ context }) => {
    const userId = context.auth.userId;

    if (!userId) return;

    void context.queryClient.prefetchQuery(
      dashboardAnalyticsQuery({
        params: { userId, orgId: context.auth.orgId ?? null },
      }),
    );
  },
  component: Dashboard,
  validateSearch: valibotValidator(dashboardSearchSchema),
});

function Dashboard() {
  const { userId } = useAuth();
  const { orgId } = useActiveSpace();
  const { user } = useUser();
  const timezone =
    (user?.publicMetadata as { preferredTimezone?: string } | undefined)
      ?.preferredTimezone ?? "UTC";

  const { data: analytics, error } = useQuery(
    dashboardAnalyticsQuery({
      params: { userId: userId!, orgId },
    }),
  );

  if (error) {
    throw error;
  }

  if (!analytics) {
    return (
      <DashboardLayout Navbar={<DashboardNavbar />}>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  // Empty state
  if (analytics.activeSubscriptionsTotal === 0) {
    return (
      <DashboardLayout Navbar={<DashboardNavbar />}>
        <EmptyDashboard />
      </DashboardLayout>
    );
  }

  // Normal state
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <AnalyticsWidget>
        <StatCards data={analytics} className="col-span-full" />
        <CashFlowChart
          cashFlowForecast={analytics.cashFlowForecast}
          totalUpcomingMonth={analytics.totalUpcomingMonth}
          preferredCurrencyCode={analytics.preferredCurrencyCode}
          timezone={timezone}
          className="lg:col-span-7"
        />
        <UpcomingRenewals
          upcomingRenewals={analytics.upcomingRenewals}
          timezone={timezone}
          className="h-full lg:col-span-5"
        />
        <CategorySpendingChart
          categorySpending={analytics.categorySpending}
          preferredCurrencyCode={analytics.preferredCurrencyCode}
          className="lg:col-span-5"
        />
        <MonthlySpendingTrendChart
          monthlyTrend={analytics.monthlyTrend}
          preferredCurrencyCode={analytics.preferredCurrencyCode}
          className="h-full lg:col-span-7"
        />
      </AnalyticsWidget>
    </DashboardLayout>
  );
}

function DashboardSkeleton() {
  return (
    <AnalyticsWidget>
      <div className="col-span-full grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-4">
        {STAT_CARD_SKELETONS.map((item) => (
          <Skeleton key={item} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="min-h-80 rounded-lg lg:col-span-7" />
      <Skeleton className="min-h-80 rounded-lg lg:col-span-5" />
      <Skeleton className="min-h-72 rounded-lg lg:col-span-5" />
      <Skeleton className="min-h-72 rounded-lg lg:col-span-7" />
    </AnalyticsWidget>
  );
}
