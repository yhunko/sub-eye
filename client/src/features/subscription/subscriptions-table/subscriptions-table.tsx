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
  Button,
} from "@/shared/components";
import { SubscriptionsTableNoResults } from "./ui/subscriptions-table-no-results";
import {
  subscriptionsQueryParsers,
  SubscriptionsSearch,
  subscriptionsQuery,
  SubscriptionsFilter,
  CategoryFilterChips,
} from "@/entities/subscription";
import { useAuth } from "@clerk/clerk-react";
import { cn } from "@/shared/lib/classes-utils";
import { useQueryStates } from "nuqs";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { SubscriptionSortField } from "shared";
import * as m from "@/i18n/messages";
import { TableBodyLoader } from "@/shared/ui";
import { SubscriptionsMonthlySpendCard } from "../../analytics";
import { ArrowRightLeft } from "lucide-react";

const SubscriptionsTable: FC = () => {
  const [filters, setFilters] = useQueryStates(subscriptionsQueryParsers, {
    history: "replace",
  });

  const { search, sortBy, direction, categoryId } = filters;

  const queryParams = useMemo(() => {
    const trimmedSearch = search.trim();

    return {
      sortBy,
      direction,
      status: filters.status,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
      ...(categoryId ? { categoryId } : {}),
    };
  }, [direction, search, sortBy, filters.status, categoryId]);

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
      <div className="grid grid-cols-2 gap-2">
        <SubscriptionsMonthlySpendCard />
      </div>

      <div className="flex items-center gap-2">
        <SubscriptionsSearch
          placeholder={m.common_placeholders_search()}
          className="max-w-sm"
          loading={isTableLoading}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/subscriptions/compare">
              <ArrowRightLeft className="size-4" aria-hidden />
              {m.comparator_action_open()}
            </Link>
          </Button>
          <SubscriptionsFilter
            status={filters.status}
            onStatusChange={(nextStatus) => setFilters({ status: nextStatus })}
          />
        </div>
      </div>
      <CategoryFilterChips
        value={categoryId}
        onChange={(id) => void setFilters({ categoryId: id })}
      />
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
              table.getRowModel().rows.map((row) => {
                const isCancelled = row.original.status === "cancelled";
                const isCancelledButActive =
                  row.original.status === "cancelledButActive";

                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      isCancelled && "bg-muted/30 opacity-75",
                      isCancelledButActive && "bg-amber-500/5",
                    )}
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
                );
              })
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
