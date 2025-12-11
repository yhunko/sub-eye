import { ColumnDef } from "@tanstack/table-core";
import { format, isDate } from "date-fns";
import { SubscriptionTableHead } from "../ui/subscription-table-head";
import { CreditCard, Calendar1 } from "lucide-react";
import { SubscriptionDto } from "@/entities/subscription";
import { CurrencyBadge } from "../../currency/ui/currency-badge";

export const columns: ColumnDef<SubscriptionDto>[] = [
  {
    accessorKey: "name",
    header: "Subscription name",
  },
  {
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
    accessorKey: "nextPaymentDate",
    header: () => {
      return <SubscriptionTableHead header="Next bill" Icon={Calendar1} />;
    },
    cell: ({ getValue }) => {
      const date = getValue();

      if (isDate(date)) return format(date, "MMM dd, yyyy");

      return "Unknown or corrupted date";
    },
  },
];
