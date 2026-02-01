import { FC, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  SortingState,
  OnChangeFn,
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
import {
  subscriptionsQueryParsers,
  SubscriptionsSearch,
  subscriptionsQuery,
} from "@/entities/subscription";
import { useAuth } from "@clerk/clerk-react";
import { cn } from "@/shared/lib/classes-utils";
import { useQueryStates } from "nuqs";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SubscriptionSortField } from "@shared/domains/subscription";
import * as m from "@/i18n/messages";
import { TableBodyLoader } from "@/shared/ui";

const SubscriptionsTable: FC = () => {
  const [filters, setFilters] = useQueryStates(subscriptionsQueryParsers, {
    history: "replace",
  });

  const { search, sortBy, direction } = filters;

  const queryParams = useMemo(() => {
    const trimmedSearch = search.trim();

    return {
      sortBy,
      direction,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
    };
  }, [direction, search, sortBy]);

  const { userId } = useAuth();
  const { data: subscriptions, isLoading } = useQuery(
    subscriptionsQuery({
      params: {
        userId: userId!,
        queryParams,
      },
      options: {
        placeholderData: keepPreviousData,
      },
    }),
  );

  const columns = useColumns();
  const data = useMemo(() => subscriptions ?? [], [subscriptions]);

  const sorting: SortingState = useMemo(
    () => [{ id: sortBy, desc: direction === "desc" }],
    [sortBy, direction],
  );

  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    const nextSorting =
      typeof updater === "function" ? updater(sorting) : updater;
    const sort = nextSorting[0];

    if (sort) {
      void setFilters({
        sortBy: sort.id as SubscriptionSortField,
        direction: sort.desc ? "desc" : "asc",
      });
    }
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSortingRemoval: false,
    state: {
      sorting,
    },
    onSortingChange,
  });

  const isTableLoading = isLoading;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SubscriptionsSearch
          placeholder={m.common_placeholders_search()}
          className="max-w-sm"
          loading={isTableLoading}
        />
      </div>
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

export default SubscriptionsTable;
