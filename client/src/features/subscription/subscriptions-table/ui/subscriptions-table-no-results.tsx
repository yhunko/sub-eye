import { TableRow, TableCell } from "@/shared/components";
import { FC } from "react";
import * as m from "@/i18n/messages";

type SubscriptionsTableNoResultsProps = {
  loading?: boolean;
  columnsLength: number;
};

export const SubscriptionsTableNoResults: FC<
  SubscriptionsTableNoResultsProps
> = ({ loading, columnsLength }) => {
  return (
    <TableRow>
      <TableCell colSpan={columnsLength} className="h-24 text-center">
        {loading ? "" : m.common_noResults()}
      </TableCell>
    </TableRow>
  );
};
