import { FC } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  subscriptionOverviewFloatingCardClassName,
  subscriptionOverviewTopSectionClassName,
} from "./subscription-overview-layout-classnames";

export const SubscriptionOverviewSkeleton: FC = () => {
  return (
    <div className="flex h-full w-full flex-1 animate-pulse flex-col">
      <div className={subscriptionOverviewTopSectionClassName}>
        <Skeleton className="size-11 rounded-full" />
      </div>

      <div className={subscriptionOverviewFloatingCardClassName}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>

        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-20 rounded-full md:size-24" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="space-y-1 rounded-2xl border p-2">
            {["payment", "period", "previous"].map((rowKey) => (
              <Skeleton key={rowKey} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
