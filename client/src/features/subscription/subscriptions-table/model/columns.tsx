import { BrandfetchImage } from "@/features/brandfetch";
import { useMemo, FC } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { SubscriptionTableHead } from "../ui/subscriptions-table-head";
import { Type, Calendar1, CreditCard, CalendarSync } from "lucide-react";
import { SubscriptionDto, CategoryDto } from "shared";
import { SubscriptionNextBill } from "../../billing";
import { CurrencyBadge } from "@/entities/currency";
import { PeriodBadge } from "../../period";
import { CategoryBadge } from "@/entities/category";
import * as m from "@/i18n/messages";
import { cn } from "@/shared/lib/classes-utils";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { DefaultSubscriptionRowActions } from "../ui/default-subscription-row-actions";

export type UseColumnsParams = {
  onToggleSelect?: (id: string) => void;
  isSelected?: (id: string) => boolean;
  allVisibleSelected?: boolean;
  onToggleAll?: () => void;
  enableSelection?: boolean;
  showCategoryColumn: boolean;
  categories: CategoryDto[];
  rowActions?: FC<{ subscription: SubscriptionDto }>;
};

export const useColumns = ({
  onToggleSelect,
  isSelected,
  allVisibleSelected,
  onToggleAll,
  enableSelection = true,
  showCategoryColumn,
  categories,
  rowActions,
}: UseColumnsParams): ColumnDef<SubscriptionDto>[] => {
  return useMemo(() => {
    const cols: ColumnDef<SubscriptionDto>[] = [];

    if (enableSelection && onToggleSelect && isSelected && onToggleAll) {
      cols.push({
        id: "select",
        header: () => (
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={() => onToggleAll()}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected(row.original.id)}
              onCheckedChange={() => onToggleSelect(row.original.id)}
              aria-label={`Select ${row.original.name}`}
            />
          </div>
        ),
        size: 40,
        enableSorting: false,
      });
    }

    cols.push({
      id: "icon",
      accessorKey: "brandDomain",
      header: "",
      size: 40,
      cell: ({ getValue, row }) => {
        const brandDomain = getValue<SubscriptionDto["brandDomain"]>();
        const isCancelled = row.original.status === "cancelled";

        return (
          <BrandfetchImage
            domain={brandDomain}
            className={cn(isCancelled && "grayscale")}
          />
        );
      },
    });

    cols.push({
      id: "name",
      accessorKey: "name",
      enableSorting: true,
      header: ({ column }) => {
        return (
          <SubscriptionTableHead
            header={m.subscription_table_column_name()}
            Icon={Type}
            sorted={column.getIsSorted()}
            onSort={column.getToggleSortingHandler()}
          />
        );
      },
    });

    cols.push({
      id: "cost",
      accessorKey: "billing",
      enableSorting: true,
      sortingFn: (a, b) =>
        a.original.billing.preferred.amount -
        b.original.billing.preferred.amount,
      header: ({ column }) => {
        return (
          <SubscriptionTableHead
            header={m.subscription_table_column_cost()}
            Icon={CreditCard}
            sorted={column.getIsSorted()}
            onSort={column.getToggleSortingHandler()}
          />
        );
      },
      cell: ({ getValue }) => {
        const billing = getValue<SubscriptionDto["billing"]>();

        return (
          <CurrencyBadge
            currencyCode={billing.preferred.currencyCode}
            amount={billing.preferred.amount}
          />
        );
      },
    });

    cols.push({
      id: "interval",
      header: () => {
        return (
          <SubscriptionTableHead
            header={m.subscription_table_column_period()}
            Icon={CalendarSync}
          />
        );
      },
      cell: ({ row }) => {
        const subscription = row.original;

        return (
          <PeriodBadge
            every={subscription.every}
            period={subscription.period}
          />
        );
      },
    });

    cols.push({
      id: "nextPaymentDate",
      accessorKey: "nextPaymentDate",
      enableSorting: true,
      header: ({ column }) => {
        return (
          <SubscriptionTableHead
            header={m.subscription_table_column_nextBill()}
            Icon={Calendar1}
            sorted={column.getIsSorted()}
            onSort={column.getToggleSortingHandler()}
          />
        );
      },
      cell: ({ row }) => {
        const subscription = row.original;

        if (subscription.status === "cancelled") {
          return (
            <span className="text-muted-foreground line-through opacity-75">
              {m.subscription_status_cancelled()}
            </span>
          );
        }

        if (
          subscription.status === "cancelledButActive" &&
          subscription.willBeCancelledAt
        ) {
          return (
            <div className="flex flex-col items-start gap-1">
              <span className="text-xs font-medium text-amber-600">
                {m.subscription_status_cancelledButActive()}
              </span>
              <SubscriptionNextBill
                nextBillDate={subscription.willBeCancelledAt}
              />
            </div>
          );
        }

        return (
          <SubscriptionNextBill nextBillDate={subscription.nextPaymentDate} />
        );
      },
    });

    if (showCategoryColumn) {
      cols.push({
        id: "category",
        accessorKey: "categoryId",
        header: () => (
          <SubscriptionTableHead header={m.form_basicInfo_category_label()} />
        ),
        cell: ({ row }) => {
          const category = categories.find(
            (c) => c.id === row.original.categoryId,
          );
          return <CategoryBadge category={category} />;
        },
        size: 140,
        enableSorting: false,
      });
    }

    cols.push({
      id: "actions",
      accessorKey: "id",
      header: "",
      cell: ({ row }) => {
        const RowActionsComponent = rowActions ?? DefaultSubscriptionRowActions;

        return (
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <RowActionsComponent subscription={row.original} />
          </div>
        );
      },
    });

    return cols;
  }, [
    onToggleSelect,
    isSelected,
    allVisibleSelected,
    onToggleAll,
    enableSelection,
    showCategoryColumn,
    categories,
    rowActions,
  ]);
};
