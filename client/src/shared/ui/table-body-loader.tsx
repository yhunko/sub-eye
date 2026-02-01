import { FC } from "react";
import { TableCell, TableRow, Spinner } from "../components";
import { cn } from "../lib/classes-utils";

type TableBodyLoaderProps = {
  loading?: boolean;
  columnsLength: number;
};

export const TableBodyLoader: FC<TableBodyLoaderProps> = ({
  loading,
  columnsLength,
}) => {
  if (!loading) return null;

  return (
    <TableRow
      key="TABLE_LOADER"
      className={cn(
        "absolute inset-0 h-full bg-white/50 backdrop-blur-xs dark:bg-black/50",
        "transition-opacity duration-500 ease-in-out",
      )}
    >
      <TableCell
        colSpan={columnsLength}
        className="flex h-full items-center justify-center"
      >
        <Spinner className="size-8" />
      </TableCell>
    </TableRow>
  );
};
