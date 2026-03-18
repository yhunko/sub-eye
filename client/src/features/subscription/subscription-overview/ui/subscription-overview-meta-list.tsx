import { FC } from "react";
import { CalendarClock, CalendarSync, RotateCw, Tag } from "lucide-react";
import { PeriodBadge } from "@/features/subscription/period";
import { CategoryBadge } from "@/entities/category";
import { cn } from "@/shared/lib/classes-utils";
import type { SubscriptionOverviewMetaRow } from "../model/subscription-overview-view-model";

type SubscriptionOverviewMetaListProps = {
  rows: SubscriptionOverviewMetaRow[];
};

function RowIcon({ row }: { row: SubscriptionOverviewMetaRow }) {
  if (row.kind === "period") {
    return <RotateCw className="size-4" aria-hidden />;
  }

  if (row.kind === "previousPayment") {
    return <CalendarClock className="size-4" aria-hidden />;
  }

  if (row.kind === "category") {
    return <Tag className="size-4" aria-hidden />;
  }

  return <CalendarSync className="size-4" aria-hidden />;
}

function RowValue({ row }: { row: SubscriptionOverviewMetaRow }) {
  if (row.kind === "period") {
    return (
      <PeriodBadge
        every={row.every}
        period={row.period}
        className="text-right text-sm font-semibold"
      />
    );
  }

  if (row.kind === "summary") {
    return (
      <div className="text-right">
        <p>{row.value}</p>
        {row.relativeText && (
          <p className={cn("text-xs", row.relativeClassName)}>
            {row.relativeText}
          </p>
        )}
      </div>
    );
  }

  if (row.kind === "category") {
    return <CategoryBadge category={row.category} />;
  }

  return <span className="text-right text-sm font-semibold">{row.value}</span>;
}

export const SubscriptionOverviewMetaList: FC<
  SubscriptionOverviewMetaListProps
> = ({ rows }) => {
  return (
    <div className="bg-card rounded-2xl border px-2 py-1">
      {rows.map((row, index) => (
        <div key={row.key}>
          <div className="flex items-center gap-3 px-2 py-2.5">
            <span className="text-muted-foreground">
              <RowIcon row={row} />
            </span>
            <span className="text-muted-foreground flex-1 text-sm">
              {row.label}
            </span>
            <div className="text-foreground text-sm font-semibold">
              <RowValue row={row} />
            </div>
          </div>
          {index < rows.length - 1 && <div className="bg-border mx-2 h-px" />}
        </div>
      ))}
    </div>
  );
};
