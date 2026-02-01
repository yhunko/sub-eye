import { FC, PropsWithChildren } from "react";
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
        "grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12 lg:gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
};
