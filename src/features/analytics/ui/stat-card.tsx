import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/shared/components";
import { FC, PropsWithChildren } from "react";

interface StatCardProps {
  title: string;
}

export const StatCard: FC<PropsWithChildren<StatCardProps>> = ({
  title,
  children,
}) => {
  return (
    <Card className="relative gap-0 overflow-hidden py-4">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="h-full">{children}</CardContent>
    </Card>
  );
};
