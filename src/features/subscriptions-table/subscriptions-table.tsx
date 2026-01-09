"use client";

import { FC, useMemo, useState } from "react";
import {
  useSubscriptions,
  SubscriptionSortField,
  defaultSubscriptionsSortParams,
} from "@/entities/subscription";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { useColumns } from "./model/columns";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableBodyLoader,
} from "@/shared/components";
import { keepPreviousData } from "@tanstack/react-query";
import { cn } from "@/shared/lib";
import { SubscriptionsTableNoResults } from "./ui/subscriptions-table-no-results";

export const SubscriptionsTable: FC = () => {
  const [sorting, setSorting] = useState<SortingState>([
    defaultSubscriptionsSortParams,
  ]);

  const sortBy = sorting[0]?.id as SubscriptionSortField;
  const direction = sorting[0]?.desc ? "desc" : "asc";

  const {
    data: subscriptions,
    isLoading,
    isPlaceholderData,
  } = useSubscriptions({
    params: {
      sortBy,
      direction,
    },
    options: {
      placeholderData: keepPreviousData,
    },
  });

  const columns = useColumns();
  const data = useMemo(() => subscriptions ?? [], [subscriptions]);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: { sorting },
    onSortingChange: setSorting,
  });

  const isTableLoading = isLoading || isPlaceholderData;

  return (
    <div className="relative overflow-hidden rounded-md border">
      <Table className={cn(isTableLoading && "pointer-events-none")}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                if (header.isPlaceholder) return <TableHead key={header.id} />;

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
          <TableBodyLoader
            columnsLength={columns.length}
            loading={isTableLoading}
          />
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
  );
};
