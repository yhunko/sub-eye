import type {
  CategoryDto,
  StatusFilter,
  SubscriptionDto,
  SubscriptionSortField,
} from "@subeye/shared";
import { Link } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  type OnChangeFn,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowRightLeft } from "lucide-react";
import { useQueryStates } from "nuqs";
import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CategoryFilterChips,
  SubscriptionsFilter,
  SubscriptionsSearch,
  subscriptionsQueryParsers,
} from "@/entities/subscription";
import * as m from "@/i18n/messages";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { TableBodyLoader } from "@/shared/ui";
import { useColumns } from "./model/columns";
import {
  clearSubscriptionSelection,
  pruneSubscriptionSelection,
  selectAllSubscriptionIds,
  toggleSubscriptionSelection,
} from "./model/selection";
import { openBulkAssignCategoryDialog } from "./ui/open-bulk-assign-category-dialog";
import { openBulkDeleteSubscriptionsDialog } from "./ui/open-bulk-delete-subscriptions-dialog";
import { SubscriptionBulkActionBar } from "./ui/subscriptions-bulk-action-bar";
import { SubscriptionsTableNoResults } from "./ui/subscriptions-table-no-results";

type SubscriptionsTableProps = {
  subscriptions: SubscriptionDto[];
  categories: CategoryDto[];
  isLoading?: boolean;
  monthlySpendSlot?: ReactNode;
  rowActions?: FC<{ subscription: SubscriptionDto }>;
  enableBulkActions?: boolean;
};

const SubscriptionsTable: FC<SubscriptionsTableProps> = ({
  subscriptions,
  categories,
  isLoading,
  monthlySpendSlot,
  rowActions,
  enableBulkActions = true,
}) => {
  const [filters, setFilters] = useQueryStates(subscriptionsQueryParsers, {
    history: "replace",
  });

  const { sortBy, direction, categoryId } = filters;

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
    if (!enableBulkActions) return;

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
  }, [enableBulkActions]);

  const allVisibleSelected =
    visibleIds.length > 0 && selectedSubscriptionIds.size === visibleIds.length;

  const isSelected = useCallback(
    (id: string) => selectedSubscriptionIds.has(id),
    [selectedSubscriptionIds],
  );

  const columns = useColumns({
    onToggleSelect: enableBulkActions ? onToggleSelect : undefined,
    isSelected: enableBulkActions ? isSelected : undefined,
    allVisibleSelected: enableBulkActions ? allVisibleSelected : undefined,
    onToggleAll: enableBulkActions ? onToggleAll : undefined,
    enableSelection: enableBulkActions,
    showCategoryColumn,
    categories,
    rowActions,
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
      {monthlySpendSlot && (
        <div className="grid grid-cols-2 gap-2">{monthlySpendSlot}</div>
      )}

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
            onStatusChange={(nextStatus: StatusFilter) =>
              void setFilters({ status: nextStatus })
            }
          />
        </div>
      </div>
      <CategoryFilterChips
        value={categoryId}
        onChange={(id) => void setFilters({ categoryId: id })}
        categories={categories}
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
                    onClick={
                      enableBulkActions
                        ? () => onToggleSelect(row.original.id)
                        : undefined
                    }
                    className={cn(
                      enableBulkActions && "cursor-pointer",
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

      {enableBulkActions && (
        <SubscriptionBulkActionBar
          selectedCount={selectedSubscriptionIds.size}
          onSelectAll={onToggleAll}
          onDeselectAll={onClearSelection}
          onBulkDelete={onBulkDelete}
          onBulkAssignCategory={onBulkAssignCategory}
        />
      )}
    </div>
  );
};

export default SubscriptionsTable;
