"use client";

import * as React from "react";
import { FC, useState } from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Search, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Command,
  CommandInput,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
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
import { cn } from "@/shared/lib";
import { BrandfetchUtils } from "@/entities/brandfetch/lib/brandfetch-utils";

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

  const SelectButton = (
    <Button size="icon" variant="outline">
      <Search className="size-4" />
    </Button>
  );

  if (!mounted) return SelectButton;

  const Trigger = selected ? (
    <Avatar className="group cursor-pointer transition-transform duration-300 ease-in-out hover:scale-110">
      <AvatarImage
        src={BrandfetchUtils.getImageUrl(selected?.domain)}
        alt={selected?.name || "Brand logo"}
      />
    </Avatar>
  ) : (
    SelectButton
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{Trigger}</PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          {Content}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{Trigger}</DrawerTrigger>
      <DrawerContent className="p-0">
        <VisuallyHidden.Root>
          <DrawerHeader>
            <DrawerTitle>Search Brand</DrawerTitle>
            <DrawerDescription>Select a brand from the list</DrawerDescription>
          </DrawerHeader>
        </VisuallyHidden.Root>
        <div className="mt-4 border-t">{Content}</div>
      </DrawerContent>
    </Drawer>
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
