import { ColumnDef } from "@tanstack/table-core";
import { format, isDate } from "date-fns";
import { SubscriptionTableHead } from "../ui/subscription-table-head";
import { CreditCard, Calendar1 } from "lucide-react";
import { SubscriptionDto } from "@/entities/subscription";
import { CurrenciesMap } from "@/entities/monobank";

export const columns: ColumnDef<SubscriptionDto>[] = [
  {
    accessorKey: "name",
    header: "Subscription name",
  },
  {
    accessorKey: "billing",
    header: () => {
      return <SubscriptionTableHead header="Cost" Icon={CreditCard} />;
    },
    cell: ({ getValue }) => {
      const billing = getValue<SubscriptionDto["billing"]>();
      const currencyMeta = CurrenciesMap.get(billing.preferred.currencyCode);

      if (currencyMeta) {
        return `${currencyMeta.symbol}${billing.preferred.amount}`;
      }

      return billing.preferred.amount;
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
