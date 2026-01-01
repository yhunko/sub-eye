"use client";

import * as React from "react";
import { FC, useState, useMemo } from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Check, Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
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
  Spinner,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/shared/components";
import {
  useDebouncedState,
  useUncontrolled,
  useMediaQuery,
} from "@mantine/hooks";
import { useBrandfetchSearch } from "@/entities/brandfetch/api/hooks";
import { BrandfetchSearchDto } from "@/entities/brandfetch/model/dtos";
import { keepPreviousData } from "@tanstack/react-query";
import { BrandfetchUtils } from "@/entities/brandfetch/lib/brandfetch-utils";

interface BrandPickerProps {
  value?: BrandfetchSearchDto;
  onChange?: (brand: BrandfetchSearchDto) => void;
}

export const BrandfetchPicker: FC<BrandPickerProps> = ({ value, onChange }) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [selected, setSelected] = useUncontrolled({ value, onChange });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useDebouncedState("", 500);

  const { data, isLoading } = useBrandfetchSearch({
    params: { name: query },
    options: {
      placeholderData: keepPreviousData,
    },
  });

  const brandImageUrl = selected
    ? BrandfetchUtils.getImageUrl(selected.domain)
    : null;

  const PickerContent = useMemo(
    () => (
      <Command shouldFilter={false} className="h-[60vh]">
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
                onSelect={() => {
                  setSelected(brand);
                  setOpen(false);
                }}
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
                    selected?.domain === brand.domain
                      ? "opacity-100"
                      : "opacity-0",
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    ),
    [data, isLoading, selected?.domain, setQuery, setSelected],
  );

  const Trigger = brandImageUrl ? (
    <Avatar className="group cursor-pointer transition-transform duration-300 ease-in-out hover:scale-110">
      <AvatarImage src={brandImageUrl} alt={selected?.name || "Brand logo"} />
    </Avatar>
  ) : (
    <Button size="icon" variant="outline">
      <Search className="size-4" />
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{Trigger}</DrawerTrigger>
        <DrawerContent className="p-0">
          <VisuallyHidden.Root>
            <DrawerHeader>
              <DrawerTitle>Search Brand</DrawerTitle>
              <DrawerDescription>
                Select a brand from the list
              </DrawerDescription>
            </DrawerHeader>
          </VisuallyHidden.Root>
          <div className="mt-4 border-t">{PickerContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{Trigger}</PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        {PickerContent}
      </PopoverContent>
    </Popover>
  );
};
