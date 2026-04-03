import type { Locale } from "date-fns";
import { format, parseISO } from "date-fns";
import { List } from "lucide-react";
import type { FC } from "react";
import type { MonthlyTrendPoint } from "shared";
import { CurrencyText } from "@/entities/currency";
import * as m from "@/i18n/messages";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

type SelectedMonthSummaryProps = {
  selectedMonth: MonthlyTrendPoint;
  preferredCurrencyCode: string;
  locale: Locale;
  onOpenDetails: () => void;
};

export const SelectedMonthSummary: FC<SelectedMonthSummaryProps> = ({
  selectedMonth,
  preferredCurrencyCode,
  locale,
  onOpenDetails,
}) => {
  return (
    <div className="bg-muted/25 border-border mb-3 flex items-center justify-between gap-2 rounded-xl border p-2.5">
      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px]">
          {format(parseISO(selectedMonth.date), "LLLL yyyy", { locale })}
        </p>
        <div className="text-foreground text-sm font-semibold tabular-nums">
          <CurrencyText
            amount={selectedMonth.amount}
            currencyCode={preferredCurrencyCode}
          />
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="rounded-full px-3"
        onClick={onOpenDetails}
      >
        <List className="size-4" />
        <span>{m.common_subscriptions()}</span>
        <Badge variant="outline" className="rounded-full px-1.5">
          {selectedMonth.subscriptions?.length ?? 0}
        </Badge>
      </Button>
    </div>
  );
};
