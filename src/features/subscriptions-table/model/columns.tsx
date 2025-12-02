import { ColumnDef } from "@tanstack/table-core";
import { SubscriptionSchema } from "@/shared/lib/db";
import { format, isDate } from "date-fns";
import { SubscriptionTableHead } from "../ui/subscription-table-head";
import { CreditCard, Calendar1 } from "lucide-react";

export const columns: ColumnDef<SubscriptionSchema>[] = [
  {
    accessorKey: "name",
    header: "Subscription name",
  },
  {
    accessorKey: "cost",
    header: () => {
      return <SubscriptionTableHead header="Cost" Icon={CreditCard} />;
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
