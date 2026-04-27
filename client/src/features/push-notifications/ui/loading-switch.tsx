import type { ComponentProps } from "react";
import { Spinner, Switch } from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";

type LoadingSwitchProps = ComponentProps<typeof Switch> & {
  isLoading?: boolean;
};

export const LoadingSwitch = ({
  isLoading = false,
  disabled,
  className,
  ...props
}: LoadingSwitchProps) => {
  return (
    <div className="relative inline-flex items-center justify-center">
      <Switch
        {...props}
        disabled={disabled || isLoading}
        className={cn(isLoading && "opacity-60", className)}
      />
      {isLoading && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Spinner className="text-foreground size-3" />
        </span>
      )}
    </div>
  );
};
