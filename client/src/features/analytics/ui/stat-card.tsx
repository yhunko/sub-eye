import { FC, PropsWithChildren } from "react";
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
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
};
