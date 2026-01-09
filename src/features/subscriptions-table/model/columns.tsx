import { ColumnDef, RowData } from "@tanstack/table-core";
import { SubscriptionTableHead } from "../ui/subscription-table-head";
import {
  CreditCard,
  Calendar1,
  CalendarSync,
  EyeIcon,
  Edit,
} from "lucide-react";
import { SubscriptionDto } from "@/entities/subscription";
import { CurrencyBadge } from "../../currency";
import { PeriodBadge } from "../../subscription/ui/period-badge";
import { SubscriptionNextBill } from "../../subscription/ui/subscription-next-bill";
import * as React from "react";
import { BrandfetchImage } from "../../brandfetch";
import { SubscriptionDeleteButton } from "../../subscription";
import { Button, ButtonGroup } from "@/shared/components";
import Link from "next/link";
import { useTranslations } from "next-intl";

declare module "@tanstack/table-core" {
  // Official tanstack table example: https://tanstack.com/table/latest/docs/api/core/table#options
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    deleteRow?: (id: number) => void;
  }
}

export const useColumns = (): ColumnDef<SubscriptionDto>[] => {
  const t = useTranslations("subscription.table.columns");

  return [
    {
      id: "icon",
      accessorKey: "brandDomain",
      header: "",
      size: 40,
      cell: ({ getValue }) => {
        const brandDomain = getValue<SubscriptionDto["brandDomain"]>();

        return <BrandfetchImage domain={brandDomain} />;
      },
    },
    {
      id: "name",
      accessorKey: "name",
      header: t("name"),
    },
    {
      id: "cost",
      accessorKey: "billing",
      enableSorting: true,
      sortingFn: (a, b) =>
        a.original.billing.preferred.amount -
        b.original.billing.preferred.amount,
      header: ({ column }) => {
        return (
          <SubscriptionTableHead
            header={t("cost")}
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
    },
    {
      id: "interval",
      header: () => {
        return (
          <SubscriptionTableHead header={t("period")} Icon={CalendarSync} />
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
    },
    {
      id: "nextPaymentDate",
      accessorKey: "nextPaymentDate",
      enableSorting: true,
      header: ({ column }) => {
        return (
          <SubscriptionTableHead
            header={t("nextBill")}
            Icon={Calendar1}
            sorted={column.getIsSorted()}
            onSort={column.getToggleSortingHandler()}
          />
        );
      },
      cell: ({ row }) => {
        const subscription = row.original;

        return (
          <SubscriptionNextBill nextBillDate={subscription.nextPaymentDate} />
        );
      },
    },
    {
      id: "actions",
      accessorKey: "id",
      header: "",
      cell: ({ row, getValue }) => {
        const id = getValue<SubscriptionDto["id"]>();

        const subscription = row.original;

        return (
          <ButtonGroup
            orientation="horizontal"
            aria-label="Subscription actions"
            className="h-fit"
          >
            <Button
              variant="outline"
              size="icon-sm"
              asChild
              aria-label={`View ${subscription.name}`}
            >
              <Link href={`/subscriptions/${id}`} passHref>
                <EyeIcon />
                <span className="sr-only">View {subscription.name}</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              asChild
              aria-label={`Edit ${subscription.name}`}
            >
              <Link href={`/subscriptions/${id}/edit`} passHref>
                <Edit className="size-4 transition-all" />
                <span className="sr-only">Edit {subscription.name}</span>
              </Link>
            </Button>
            <SubscriptionDeleteButton
              subscriptionId={id}
              subscriptionName={subscription.name}
            />
          </ButtonGroup>
        );
      },
    },
  ];
};
