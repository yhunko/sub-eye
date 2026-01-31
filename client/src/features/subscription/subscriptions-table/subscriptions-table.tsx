import { FC, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useColumns } from "./model/columns";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/shared/components";
import { SubscriptionsTableNoResults } from "./ui/subscriptions-table-no-results";
import { useSubscriptions } from "../../../entities/subscription";
import { useAuth } from "@clerk/clerk-react";
import { cn } from "@/shared/lib/classes-utils";

const SubscriptionsTable: FC = () => {
  const { userId } = useAuth();
  const { data: subscriptions, isLoading } = useSubscriptions({
    params: {
      userId: userId!,
    },
  });

  const columns = useColumns();
  const data = useMemo(() => subscriptions ?? [], [subscriptions]);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });

  const isTableLoading = isLoading;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-md border">
        <Table className={cn(isTableLoading && "pointer-events-none")}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  if (header.isPlaceholder)
                    return <TableHead key={header.id} />;

                  return (
                    <TableHead key={header.id}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="relative overflow-hidden">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <SubscriptionsTableNoResults
                loading={isTableLoading}
                columnsLength={columns.length}
              />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SubscriptionsTable;
