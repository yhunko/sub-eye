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
import { useDebouncedState, useUncontrolled } from "@mantine/hooks";
import { useBrandfetchSearch } from "@/entities/brandfetch/api/hooks";
import { BrandfetchSearchDto } from "@/entities/brandfetch/model/dtos";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { BrandfetchImage } from "./brandfetch-image";
import { cn } from "@/shared/lib/classes-utils";

import * as m from "@/i18n/messages";

const BrandfetchPickerDesktop = lazy(
  () => import("./brandfetch-picker.desktop"),
);
const BrandfetchPickerMobile = lazy(() => import("./brandfetch-picker.mobile"));

const DEFAULT_BRANDS: BrandfetchSearchDto[] = [
  {
    brandId: "netflix.com",
    name: "Netflix",
    domain: "netflix.com",
  },
  {
    brandId: "spotify.com",
    name: "Spotify",
    domain: "spotify.com",
  },
  {
    brandId: "youtube.com",
    name: "YouTube",
    domain: "youtube.com",
  },
  {
    brandId: "apple.com",
    name: "Apple",
    domain: "apple.com",
  },
  {
    brandId: "google.com",
    name: "Google",
    domain: "google.com",
  },
  {
    brandId: "amazon.com",
    name: "Amazon",
    domain: "amazon.com",
  },
  {
    brandId: "facebook.com",
    name: "Facebook",
    domain: "facebook.com",
  },
  {
    brandId: "instagram.com",
    name: "Instagram",
    domain: "instagram.com",
  },
  {
    brandId: "twitter.com",
    name: "Twitter",
    domain: "twitter.com",
  },
  {
    brandId: "linkedin.com",
    name: "LinkedIn",
    domain: "linkedin.com",
  },
].map((item) => ({
  ...item,
  icon: `https://cdn.brandfetch.io/${item.domain}/w/80/h/80/fallback/lettermark/type/icon?c=${import.meta.env.VITE_BRANDFETCH_CLIENT_ID}`,
}));

interface BrandPickerProps {
  value?: BrandfetchSearchDto;
  onChange?: (brand: BrandfetchSearchDto) => void;
  triggerVariant?: "default" | "hero";
  triggerClassName?: string;
}

export const BrandfetchPicker: FC<BrandPickerProps> = ({
  value,
  onChange,
  triggerVariant = "default",
  triggerClassName,
}) => {
  const isDesktop = useBreakpoint("lg");
  const [selected, setSelected] = useUncontrolled({ value, onChange });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useDebouncedState("", 500);
  const isHeroTrigger = triggerVariant === "hero";

  const { data, isLoading } = useBrandfetchSearch({
    params: { name: query },
    options: {
      placeholderData: DEFAULT_BRANDS,
      enabled: !!query?.length,
    },
  });

  const Content = (
    <PickerContent
      data={data ?? []}
      isLoading={isLoading}
      onSelect={(brand) => {
        setSelected(brand);
        if (!isDesktop) {
          // Sync with keyboard animation
          // 1. dismiss keyboard immediately
          (document.activeElement as HTMLElement)?.blur();
          // 2. wait for keyboard to start hiding before closing drawer
          setTimeout(() => setOpen(false), 300);
        } else {
          setOpen(false);
        }
      }}
      setQuery={setQuery}
      selectedDomain={selected?.domain}
    />
  );

  const TriggerButton = useMemo(
    () => (
      <Button
        variant="outline"
        type="button"
        className={cn(
          "group relative overflow-hidden rounded-full transition-all duration-200",
          isHeroTrigger
            ? "m-0 size-24 border-2 p-0 shadow-sm hover:scale-[1.03] md:size-28"
            : "size-9 p-0",
          open && isHeroTrigger && "scale-[1.08]",
          triggerClassName,
        )}
        aria-label={m.features_brandfetch_picker_searchAriaLabel()}
      >
        {selected ? (
          <BrandfetchImage
            domain={selected.domain}
            className={cn(
              "rounded-full",
              isHeroTrigger
                ? "border-border/60 size-full border"
                : "size-8 transition-opacity hover:opacity-75",
            )}
          />
        ) : (
          <Search
            className={cn(isHeroTrigger ? "size-10" : "size-4")}
            aria-hidden
          />
        )}

        <span className="sr-only">
          {m.features_brandfetch_picker_searchAriaLabel()}
        </span>
      </Button>
    ),
    [isHeroTrigger, open, selected, triggerClassName],
  );

  if (isDesktop) {
    return (
      <Suspense fallback={TriggerButton}>
        <BrandfetchPickerDesktop
          open={open}
          onOpenChange={setOpen}
          trigger={TriggerButton}
          content={Content}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={TriggerButton}>
      <BrandfetchPickerMobile
        open={open}
        onOpenChange={setOpen}
        trigger={TriggerButton}
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
    <Command shouldFilter={false} className="flex h-[80vh] flex-col lg:h-auto">
      <CommandInput
        placeholder={m.features_brandfetch_picker_searchPlaceholder()}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-full flex-1 overflow-y-auto overscroll-contain">
        <CommandEmpty className="flex flex-col items-center gap-4 py-5">
          {isLoading ? (
            <Spinner className="size-12 md:size-8" />
          ) : (
            <span>{m.features_brandfetch_picker_noResults()}</span>
          )}
        </CommandEmpty>
        <CommandGroup>
          {data?.map((brand) => (
            <CommandItem
              key={brand.domain}
              value={brand.domain}
              onSelect={() => onSelect(brand)}
              className="touch-manipulation"
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
