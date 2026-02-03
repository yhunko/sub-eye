import { BrandfetchImage } from "@/features/brandfetch";
import { ColumnDef } from "@tanstack/react-table";
import { SubscriptionTableHead } from "../ui/subscriptions-table-head";
import { Type, Calendar1, CreditCard, CalendarSync } from "lucide-react";
import { ButtonGroup } from "@/shared/components";
import { SubscriptionDto } from "@shared/domains/subscription";
import { SubscriptionNextBill } from "../../billing";
import { CurrencyBadge } from "@/entities/currency";
import { PeriodBadge } from "../../period";

import * as m from "@/i18n/messages";
import { SubscriptionDeleteButton } from "../../delete-subscription";

export const useColumns = (): ColumnDef<SubscriptionDto>[] => {
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
    },
    {
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
    },
    {
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
            aria-label={m.subscription_table_actionsAriaLabel()}
            className="h-fit"
          >
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
