import { ColumnDef } from "@tanstack/table-core";
import { SubscriptionDto } from "@/shared/lib/db";
import { format, isDate } from "date-fns";

export const columns: ColumnDef<SubscriptionDto>[] = [
  {
    accessorKey: "name",
    header: "Subscription name",
  },
  {
    accessorKey: "cost",
    header: "Cost",
  },
  {
    accessorKey: "nextPaymentDate",
    header: "Next bill",
    cell: ({ getValue }) => {
      const date = getValue();

      if (isDate(date)) return format(date, "MMM dd, yyyy");

      return "Unknown or corrupted date";
    },
  },
];
