import { FC } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";

export const SubscriptionOverviewSkeleton: FC = () => {
  return (
    <div className="flex h-full w-full animate-pulse flex-col p-3 md:p-6">
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[1.75rem] border p-4 md:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Skeleton className="size-20 rounded-full md:size-24" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="mt-6 space-y-2">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="space-y-1 rounded-2xl border p-2">
            {["payment", "period", "previous"].map((rowKey) => (
              <Skeleton key={rowKey} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Skeleton className="h-11 w-full rounded-xl md:col-span-2" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
};
