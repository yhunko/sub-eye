import { FC, useState, lazy, Suspense, useMemo } from "react";
import { Search, Check } from "lucide-react";
import {
  Button,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  Spinner,
  CommandGroup,
  CommandItem,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/shared/components";
import { useDebouncedState, useUncontrolled, useMounted } from "@mantine/hooks";
import { useBrandfetchSearch } from "@/entities/brandfetch/api/hooks";
import { BrandfetchSearchDto } from "@/entities/brandfetch/model/dtos";
import { keepPreviousData } from "@tanstack/react-query";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { BrandfetchImage } from "./brandfetch-image";
import { cn } from "@/shared/lib/classes-utils";

const BrandfetchPickerDesktop = lazy(
  () => import("./brandfetch-picker.desktop"),
);
const BrandfetchPickerMobile = lazy(() => import("./brandfetch-picker.mobile"));

interface BrandPickerProps {
  value?: BrandfetchSearchDto;
  onChange?: (brand: BrandfetchSearchDto) => void;
}

export const BrandfetchPicker: FC<BrandPickerProps> = ({ value, onChange }) => {
  const isDesktop = useBreakpoint("lg");
  const mounted = useMounted();
  const [selected, setSelected] = useUncontrolled({ value, onChange });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useDebouncedState("", 500);

  const { data, isLoading } = useBrandfetchSearch({
    params: { name: query },
    options: {
      placeholderData: keepPreviousData,
    },
  });

  const Content = (
    <PickerContent
      data={data ?? []}
      isLoading={isLoading}
      onSelect={(brand) => {
        setSelected(brand);
        setOpen(false);
      }}
      setQuery={setQuery}
      selectedDomain={selected?.domain}
    />
  );

  const SelectButton = useMemo(
    () => (
      <Button
        size="icon"
        variant="outline"
        aria-label="Search and select brand"
      >
        <Search className="size-4" />
        <span className="sr-only">Search and select brand</span>
      </Button>
    ),
    [],
  );

  if (!mounted) return SelectButton;

  const Trigger = selected ? (
    <BrandfetchImage domain={selected.domain} />
  ) : (
    SelectButton
  );

  if (isDesktop) {
    return (
      <Suspense fallback={SelectButton}>
        <BrandfetchPickerDesktop
          open={open}
          onOpenChange={setOpen}
          trigger={Trigger}
          content={Content}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={SelectButton}>
      <BrandfetchPickerMobile
        open={open}
        onOpenChange={setOpen}
        trigger={Trigger}
        content={Content}
      />
    </Suspense>
  );
};

type PickerContentProps = {
  data: BrandfetchSearchDto[];
  isLoading: boolean;
  onSelect: (brand: BrandfetchSearchDto) => void;
  setQuery: (query: string) => void;
  selectedDomain?: string;
};
function PickerContent({
  data,
  isLoading,
  onSelect,
  setQuery,
  selectedDomain,
}: PickerContentProps) {
  return (
    <Command shouldFilter={false} className="h-[60vh] lg:h-auto">
      <CommandInput
        placeholder="Search brands..."
        onValueChange={setQuery}
        autoFocus
      />
      <CommandList>
        <CommandEmpty className="flex flex-col items-center gap-4 py-5">
          {isLoading ? (
            <Spinner className="size-12 md:size-8" />
          ) : (
            <span>No brand found.</span>
          )}
        </CommandEmpty>
        <CommandGroup>
          {data?.map((brand) => (
            <CommandItem
              key={brand.domain}
              value={brand.domain}
              onSelect={() => onSelect(brand)}
            >
              <Avatar className="mr-2 h-6 w-6">
                <AvatarImage src={brand.icon} alt={brand.name} />
                <AvatarFallback>{brand.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{brand.name}</span>
                <span className="text-muted-foreground text-xs">
                  {brand.domain}
                </span>
              </div>
              <Check
                className={cn(
                  "ml-auto h-4 w-4",
                  selectedDomain === brand.domain ? "opacity-100" : "opacity-0",
                )}
              />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
