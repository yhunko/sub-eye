import { TableRow, TableCell } from "@/shared/components";
import { FC } from "react";
import { useTranslations } from "next-intl";

type SubscriptionsTableNoResultsProps = {
  loading?: boolean;
  columnsLength: number;
};

export const SubscriptionsTableNoResults: FC<
  SubscriptionsTableNoResultsProps
> = ({ loading, columnsLength }) => {
  const t = useTranslations("subscription.table");

  return (
    <TableRow>
      <TableCell colSpan={columnsLength} className="h-24 text-center">
        {loading ? "" : t("noResults")}
      </TableCell>
    </TableRow>
  );
};
