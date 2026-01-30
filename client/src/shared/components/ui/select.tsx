import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";

import { cn } from "@/shared/lib/classes-utils";

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

const useSelectContext = () => {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within Select");
  }
  return context;
};

type SelectProps = React.ComponentProps<typeof DropdownMenuPrimitive.Root> & {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
};

function Select({ value, onValueChange, disabled, children, ...props }: SelectProps) {
  return (
    <DropdownMenuPrimitive.Root {...props}>
      <SelectContext.Provider value={{ value, onValueChange, disabled }}>
        {children}
      </SelectContext.Provider>
    </DropdownMenuPrimitive.Root>
  );
}

function SelectTrigger({
  className,
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  const context = useSelectContext();
  const isDisabled = disabled ?? context.disabled;

  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="select-trigger"
      disabled={isDisabled}
      type="button"
      className={cn(
        "border-input bg-background text-foreground flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm shadow-xs outline-none transition-colors",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ChevronDown className="size-4 opacity-50" />
    </DropdownMenuPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="select-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          "z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

type SelectItemProps = React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  value: string;
};

function SelectItem({
  className,
  value,
  onSelect,
  ...props
}: SelectItemProps) {
  const context = useSelectContext();
  const isSelected = context.value === value;

  return (
    <DropdownMenuPrimitive.Item
      data-slot="select-item"
      data-selected={isSelected}
      aria-selected={isSelected}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
        className,
      )}
      onSelect={(event) => {
        onSelect?.(event);
        if (event.defaultPrevented) return;
        context.onValueChange?.(value);
      }}
      {...props}
    />
  );
}

export { Select, SelectTrigger, SelectContent, SelectItem };
