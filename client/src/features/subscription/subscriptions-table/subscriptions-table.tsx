import { FC, useMemo, useState, useCallback, useEffect, useRef } from "react";
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
import { categoriesQuery } from "@/entities/category";
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
import {
  toggleSubscriptionSelection,
  selectAllSubscriptionIds,
  clearSubscriptionSelection,
  pruneSubscriptionSelection,
} from "./model/selection";
import { SubscriptionBulkActionBar } from "./ui/subscriptions-bulk-action-bar";
import { openBulkDeleteSubscriptionsDialog } from "./ui/open-bulk-delete-subscriptions-dialog";
import { openBulkAssignCategoryDialog } from "./ui/open-bulk-assign-category-dialog";

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
  const { data: subscriptions = [], isLoading } = useQuery(
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

  const { data: categories = [] } = useQuery(
    categoriesQuery({ params: { userId: userId ?? "" } }),
  );

  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<
    Set<string>
  >(new Set());

  const visibleIds = useMemo(
    () => subscriptions.map((s) => s.id),
    [subscriptions],
  );
  const showCategoryColumn = !categoryId;

  const onToggleSelect = useCallback((id: string) => {
    setSelectedSubscriptionIds((prev) => toggleSubscriptionSelection(prev, id));
  }, []);

  const onToggleAll = useCallback(() => {
    setSelectedSubscriptionIds((prev) => {
      if (prev.size === visibleIds.length) {
        return clearSubscriptionSelection();
      }
      return selectAllSubscriptionIds(visibleIds);
    });
  }, [visibleIds]);

  const onClearSelection = useCallback(() => {
    setSelectedSubscriptionIds(clearSubscriptionSelection());
  }, []);

  const onBulkDelete = useCallback(() => {
    const selected = subscriptions.filter((s) =>
      selectedSubscriptionIds.has(s.id),
    );
    void openBulkDeleteSubscriptionsDialog({
      subscriptions: selected.map((s) => ({
        id: s.id,
        name: s.name,
        brandDomain: s.brandDomain,
        categoryId: s.categoryId,
      })),
      categories,
      onClearSelection,
    });
  }, [subscriptions, selectedSubscriptionIds, categories, onClearSelection]);

  const onBulkAssignCategory = useCallback(() => {
    void openBulkAssignCategoryDialog({
      subscriptionIds: [...selectedSubscriptionIds],
      onClearSelection,
    });
  }, [selectedSubscriptionIds, onClearSelection]);

  // Prune selection when data changes (items may have been filtered out)
  useEffect(() => {
    setSelectedSubscriptionIds((prev) =>
      pruneSubscriptionSelection(prev, visibleIds),
    );
  }, [visibleIds]);

  // Refs to avoid stale closures in keyboard shortcuts
  const onBulkDeleteRef = useRef(onBulkDelete);
  const onClearSelectionRef = useRef(onClearSelection);
  const selectedSizeRef = useRef(selectedSubscriptionIds.size);

  useEffect(() => {
    onBulkDeleteRef.current = onBulkDelete;
  }, [onBulkDelete]);

  useEffect(() => {
    onClearSelectionRef.current = onClearSelection;
  }, [onClearSelection]);

  useEffect(() => {
    selectedSizeRef.current = selectedSubscriptionIds.size;
  }, [selectedSubscriptionIds.size]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedSizeRef.current >= 1
      ) {
        event.preventDefault();
        onBulkDeleteRef.current();
      }

      if (event.key === "Escape" && selectedSizeRef.current > 0) {
        event.preventDefault();
        onClearSelectionRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const allVisibleSelected =
    visibleIds.length > 0 && selectedSubscriptionIds.size === visibleIds.length;

  const columns = useColumns({
    onToggleSelect,
    isSelected: (id) => selectedSubscriptionIds.has(id),
    allVisibleSelected,
    onToggleAll,
    showCategoryColumn,
    categories,
  });

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
    data: subscriptions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSortingRemoval: false,
    state: {
      sorting,
    },
    onSortingChange,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <SubscriptionsMonthlySpendCard />
      </div>

      <div className="flex items-center gap-2">
        <SubscriptionsSearch
          placeholder={m.common_placeholders_search()}
          className="max-w-sm"
          loading={isLoading}
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
        <Table className={cn(isLoading && "pointer-events-none")}>
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
              loading={isLoading}
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
                    onClick={() => onToggleSelect(row.original.id)}
                    className={cn(
                      "cursor-pointer",
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
                loading={isLoading}
                columnsLength={columns.length}
              />
            )}
          </TableBody>
        </Table>
      </div>

      <SubscriptionBulkActionBar
        selectedCount={selectedSubscriptionIds.size}
        onSelectAll={onToggleAll}
        onDeselectAll={onClearSelection}
        onBulkDelete={onBulkDelete}
        onBulkAssignCategory={onBulkAssignCategory}
      />
    </div>
  );
};

export default SubscriptionsTable;
