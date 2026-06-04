import type { FC, PropsWithChildren } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/classes-utils";

type StatCardProps = PropsWithChildren<{
  title: string;
  className?: string;
}>;

export const StatCard: FC<StatCardProps> = ({ title, className, children }) => {
  return (
    <Card
      className={cn(
        "flex flex-col justify-between gap-0 overflow-hidden px-3 py-3 md:py-4",
        className,
      )}
    >
      <CardHeader className="px-0">
        <CardTitle className="text-muted-foreground mx-0 text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-max flex-col justify-center px-0 pt-0">
        {children}
      </CardContent>
    </Card>
  );
};
