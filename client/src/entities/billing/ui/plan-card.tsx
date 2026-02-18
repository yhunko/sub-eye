import type { FC, ReactNode } from "react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/classes-utils";

type PlanFeatureItem = {
  label: string;
  included: boolean;
};

type PlanCardProps = {
  name: string;
  description: string;
  price: string;
  period: string;
  features: PlanFeatureItem[];
  badge?: string;
  active?: boolean;
  actions?: ReactNode;
  className?: string;
};

export const PlanCard: FC<PlanCardProps> = ({
  name,
  description,
  price,
  period,
  features,
  badge,
  active = false,
  actions,
  className,
}) => {
  return (
    <Card
      className={cn(
        "relative flex flex-col",
        active && "border-emerald-500",
        className,
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">{name}</CardTitle>
          {badge && (
            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {badge}
            </Badge>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex grow flex-col gap-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-muted-foreground text-sm">/ {period}</span>
        </div>

        <ul className="flex flex-col gap-2">
          {features.map(({ label, included }) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2 text-sm",
                !included && "text-muted-foreground line-through",
              )}
            >
              <Check
                className={cn(
                  "size-4 shrink-0",
                  included ? "text-primary" : "text-muted-foreground",
                )}
              />
              {label}
            </li>
          ))}
        </ul>

        {actions && <div className="mt-auto pt-2">{actions}</div>}
      </CardContent>
    </Card>
  );
};
