import { BrandfetchImage } from "@/features/brandfetch";
import { ColumnDef } from "@tanstack/react-table";
import { SubscriptionTableHead } from "../ui/subscriptions-table-head";
import {
  Type,
  Calendar1,
  CreditCard,
  CalendarSync,
  EyeIcon,
  Edit,
} from "lucide-react";
import { Button, ButtonGroup } from "@/shared/components";
import { SubscriptionDto, CategoryDto } from "shared";
import { SubscriptionNextBill } from "../../billing";
import { CurrencyBadge } from "@/entities/currency";
import { PeriodBadge } from "../../period";
import { CategoryBadge } from "@/entities/category";

import * as m from "@/i18n/messages";
import { SubscriptionDeleteButton } from "../../delete-subscription";
import { Link } from "@tanstack/react-router";
import { cn } from "@/shared/lib/classes-utils";
import { Checkbox } from "@/shared/components/ui/checkbox";

export type UseColumnsParams = {
  onToggleSelect: (id: string) => void;
  isSelected: (id: string) => boolean;
  allVisibleSelected: boolean;
  onToggleAll: () => void;
  showCategoryColumn: boolean;
  categories: CategoryDto[];
};

export const useColumns = ({
  onToggleSelect,
  isSelected,
  allVisibleSelected,
  onToggleAll,
  showCategoryColumn,
  categories,
}: UseColumnsParams): ColumnDef<SubscriptionDto>[] => {
  const cols: ColumnDef<SubscriptionDto>[] = [];

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
      a.original.billing.preferred.amount - b.original.billing.preferred.amount,
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
        <PeriodBadge every={subscription.every} period={subscription.period} />
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
    cell: ({ row, getValue }) => {
      const id = getValue<SubscriptionDto["id"]>();
      const subscription = row.original;

      return (
        <div
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <ButtonGroup
            orientation="horizontal"
            aria-label={m.subscription_table_actionsAriaLabel()}
            className="h-fit"
          >
            <Button
              variant="outline"
              size="icon"
              asChild
              aria-label={m.subscription_table_view_aria_label({
                name: subscription.name,
              })}
            >
              <Link to="/subscriptions/$id" params={{ id }}>
                <EyeIcon />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              asChild
              aria-label={m.subscription_table_edit_aria_label({
                name: subscription.name,
              })}
            >
              <Link to="/subscriptions/$id/edit" params={{ id }}>
                <Edit className="size-4 transition-all" />
              </Link>
            </Button>
            <SubscriptionDeleteButton
              subscriptionId={id}
              subscriptionName={subscription.name}
            />
          </ButtonGroup>
        </div>
      );
    },
  });

  return cols;
};
