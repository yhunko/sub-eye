import { ColumnDef } from "@tanstack/table-core";
import { SubscriptionTableHead } from "../ui/subscription-table-head";
import { CreditCard, Calendar1, CalendarSync } from "lucide-react";
import { SubscriptionDto } from "@/entities/subscription";
import { CurrencyBadge } from "../../currency/ui/currency-badge";
import { PeriodBadge } from "../../subscription/ui/period-badge";
import { SubscriptionNextBill } from "../../subscription/ui/subscription-next-bill";

export const columns: ColumnDef<SubscriptionDto>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Subscription name",
  },
  {
    id: "cost",
    accessorKey: "billing",
    header: () => {
      return (
        <SubscriptionTableHead header="Cost (per month)" Icon={CreditCard} />
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
      return <SubscriptionTableHead header="Period" Icon={CalendarSync} />;
    },
    cell: ({ row }) => {
      const subscription = row.original;

      return (
        <PeriodBadge every={subscription.every} period={subscription.period} />
      );
    },
  },
  {
    id: "nextBillDate",
    header: ({ column }) => {
      console.log(column.getIsSorted());
      return <SubscriptionTableHead header="Next bill" Icon={Calendar1} />;
    },
    cell: ({ row }) => {
      const subscription = row.original;

      return (
        <SubscriptionNextBill nextBillDate={subscription.nextPaymentDate} />
      );
    },
  },
];
