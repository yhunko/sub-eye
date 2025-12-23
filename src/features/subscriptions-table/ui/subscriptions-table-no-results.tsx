import { TableRow, TableCell } from "@/shared/components";
import { columns } from "../model/columns";
import { FC } from "react";

type SubscriptionsTableNoResultsProps = {
  loading?: boolean;
};

export const SubscriptionsTableNoResults: FC<
  SubscriptionsTableNoResultsProps
> = ({ loading }) => {
  return (
    <TableRow>
      <TableCell colSpan={columns.length} className="h-24 text-center">
        {loading ? "" : "No reults"}
      </TableCell>
    </TableRow>
  );
};
