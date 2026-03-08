import { FC } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { subscriptionOverviewFloatingCardClassName } from "./subscription-overview-layout-classnames";

export const SubscriptionOverviewSkeleton: FC = () => {
  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <section className={subscriptionOverviewFloatingCardClassName}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-11 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
          <Skeleton className="size-11 rounded-full" />
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <Skeleton className="size-24 rounded-full md:size-28" />
            <div className="space-y-2">
              <Skeleton className="mx-auto h-9 w-52 rounded-lg" />
              <div className="flex items-center justify-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="size-1 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-6 w-32 rounded-md" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-6 w-32 rounded-md" />
            </div>
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>

        <div className="rounded-2xl border px-2 py-1">
          {["next", "period", "previous"].map((rowKey, index) => (
            <div key={rowKey}>
              <div className="flex items-center gap-3 px-2 py-2.5">
                <Skeleton className="size-4 rounded-full" />
                <Skeleton className="h-4 flex-1 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-md" />
              </div>
              {index < 2 && <div className="bg-border mx-2 h-px" />}
            </div>
          ))}
          <div className="px-2 py-2.5">
            <Skeleton className="h-5 w-40 rounded-md" />
          </div>
        </div>
      </section>
    </div>
  );
};
