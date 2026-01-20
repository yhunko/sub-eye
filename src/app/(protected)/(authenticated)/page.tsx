"use client";

import dynamic from "next/dynamic";
import { StatCardSkeleton } from "@/features/analytics/ui/stat-card-skeleton";
import { DashboardLayout } from "@/features/dashboard";
import { Skeleton } from "@/shared/components";

const DashboardClient = dynamic(
  () => import("@/features/dashboard").then((mod) => mod.DashboardClient),
  {
    ssr: false,
    loading: () => (
      <DashboardLayout Navbar={<Skeleton className="h-16 w-full" />}>
        <div className="grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <Skeleton className="col-span-full h-[300px]" />
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
          <Skeleton className="col-span-full h-[300px]" />
        </div>
      </DashboardLayout>
    ),
  },
);

export default function Home() {
  return <DashboardClient />;
}
