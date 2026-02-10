import { FC } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent } from "@/shared/components/ui/card";

export const SubscriptionOverviewSkeleton: FC = () => {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col items-center gap-4 md:flex-row">
          <Skeleton className="size-16 rounded-full md:size-20" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="size-10 rounded-md" />
      </div>

      {/* Stats Skeleton */}
      <Card className="py-0">
        <CardContent className="p-0">
          <div className="divide-border grid grid-cols-2 divide-x">
            <div className="flex flex-col items-center justify-between gap-2 p-4 md:p-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex flex-col items-center justify-between gap-2 p-4 md:p-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Skeleton */}
      <div className="flex flex-col gap-2 md:gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex h-16 items-center gap-4 rounded-lg border p-4"
          >
            <Skeleton className="size-5 rounded-full" />
            <div className="flex flex-1 flex-col justify-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Actions Skeleton */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
};
