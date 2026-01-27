"use client";

import { FC, useCallback, useMemo } from "react";
import {
  useSubscriptions,
  SubscriptionSortField,
} from "@/entities/subscription";
import { useQueryStates } from "nuqs";
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
import { useTranslations } from "next-intl";
import { SubscriptionsSearch } from "@/features/subscription/ui/subscriptions-search";
import { subscriptionsQueryParsers } from "../subscription/lib/subscriptions-query";
import { SubscriptionsMonthlySpendCard } from "../subscription/ui/subscriptions-monthly-spend-card";

export const SubscriptionsTable: FC = () => {
  const tCommon = useTranslations("common");
  const [filters, setFilters] = useQueryStates(subscriptionsQueryParsers, {
    history: "replace",
  });

  const { search, sortBy, direction } = filters;

  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: direction === "desc" }],
    [direction, sortBy],
  );
  const queryParams = useMemo(() => {
    const trimmedSearch = search.trim();

    return {
      sortBy,
      direction,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
    };
  }, [direction, search, sortBy]);

  const handleSortingChange = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const nextSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      const nextSort = nextSorting[0];

      if (!nextSort) {
        setFilters({
          sortBy: "nextPaymentDate",
          direction: "asc",
        });
        return;
      }

      setFilters({
        sortBy: nextSort.id as SubscriptionSortField,
        direction: nextSort.desc ? "desc" : "asc",
      });
    },
    [setFilters, sorting],
  );

  const {
    data: subscriptions,
    isLoading,
    isPlaceholderData,
  } = useSubscriptions({
    params: queryParams,
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
    onSortingChange: handleSortingChange,
  });

  const isTableLoading = isLoading || isPlaceholderData;

  return (
    <div className="flex flex-col gap-3">
      <SubscriptionsMonthlySpendCard />
      <SubscriptionsSearch placeholder={tCommon("placeholders.search")} />
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
