import type { FC, PropsWithChildren } from "react";
import { cn } from "@/shared/lib/classes-utils";

type AnalyticsWidgetProps = PropsWithChildren<{
  className?: string;
}>;

export const AnalyticsWidget: FC<AnalyticsWidgetProps> = ({
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 md:gap-4 lg:grid-cols-12",
        className,
      )}
    >
      {children}
    </div>
  );
};
