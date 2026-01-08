import React, { FC } from "react";
import { TimezoneOption, SharedProps } from "../model/props";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Command,
  CommandInput,
  CommandList,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  CommandItem,
} from "@/shared/components";
import { SearchX, Check } from "lucide-react";
import { cn } from "@/shared/lib";

interface TimezoneListProps extends SharedProps {
  options: TimezoneOption[];
  value: string;
  onSelect: (value: string) => void;
}

export const TimezoneList: FC<TimezoneListProps> = ({
  options,
  value,
  onSelect,
  disabled = false,
  placeholder = "Search timezone...",
  emptyTitle = "No timezone found",
}) => {
  const [search, setSearch] = React.useState("");
  const parentRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerSearch) ||
        opt.value.toLowerCase().includes(lowerSearch) ||
        opt.group.toLowerCase().includes(lowerSearch),
    );
  }, [options, search]);

  const selectedIndex = React.useMemo(() => {
    return filteredOptions.findIndex((option) => option.value === value);
  }, [filteredOptions, value]);

  // Estimate 50px for 2-line items
  const ESTIMATED_SIZE = 50;
  const initialOffset = selectedIndex >= 0 ? selectedIndex * ESTIMATED_SIZE : 0;

  const rowVirtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_SIZE,
    overscan: 5,
    initialOffset: initialOffset,
    useFlushSync: false,
  });

  React.useLayoutEffect(() => {
    const scrollElement = parentRef.current;
    if (scrollElement && selectedIndex >= 0 && !search) {
      scrollElement.scrollTo({ top: initialOffset });
    }
  }, [initialOffset, selectedIndex, search]);

  return (
    <Command shouldFilter={false}>
      <CommandInput
        value={search}
        onValueChange={setSearch}
        autoFocus
        disabled={disabled}
        placeholder={placeholder}
      />
      <CommandList
        ref={parentRef}
        className="h-[60vh] max-h-[60vh] overflow-x-hidden overflow-y-auto md:max-h-72"
      >
        {filteredOptions.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>{emptyTitle}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}

        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const option = filteredOptions[virtualRow.index];
            return (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={onSelect}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute top-0 left-0 w-full"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 shrink-0",
                    value === option.value ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {option.group}
                  </span>
                </div>
              </CommandItem>
            );
          })}
        </div>
      </CommandList>
    </Command>
  );
};
