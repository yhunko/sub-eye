import type { ComponentProps, FC } from "react";
import { SubscriptionPeriod } from "shared";
import * as m from "@/i18n/messages";
import {
  AnimatedBackground,
  Input,
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";

type SubscriptionCycleInputProps = {
  className?: string;
  everyValue: string;
  onEveryValueChange: (value: string) => void;
  onEveryBlur?: () => void;
  everyInputProps?: Omit<
    ComponentProps<typeof Input>,
    "value" | "onChange" | "onBlur"
  >;
  period: SubscriptionPeriod;
  onPeriodChange: (period: SubscriptionPeriod) => void;
};

const toggleItemClassName =
  "flex-1 overflow-hidden rounded-none first:rounded-l-md first:rounded-r-none last:rounded-l-none last:rounded-r-md hover:bg-transparent data-[state=on]:bg-transparent md:flex-none";

export const SubscriptionCycleInput: FC<SubscriptionCycleInputProps> = ({
  className,
  everyValue,
  onEveryValueChange,
  onEveryBlur,
  everyInputProps,
  period,
  onPeriodChange,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 md:flex-row md:items-center",
        className,
      )}
    >
      <Input
        type="number"
        autoComplete="off"
        className="md:max-w-28"
        {...everyInputProps}
        value={everyValue}
        onChange={(event) => onEveryValueChange(event.target.value)}
        onBlur={onEveryBlur}
      />

      <ToggleGroup
        value={period}
        type="single"
        variant="outline"
        spacing={0}
        className="w-full md:w-auto"
        onValueChange={(value) => {
          if (value) {
            onPeriodChange(value as SubscriptionPeriod);
          }
        }}
      >
        <AnimatedBackground
          defaultValue={period}
          className="bg-accent"
          transition={{
            type: "spring",
            bounce: 0.2,
            duration: 0.6,
          }}
        >
          <ToggleGroupItem
            value={SubscriptionPeriod.WEEK}
            data-id={SubscriptionPeriod.WEEK}
            aria-label={m.periods_weeks_ariaLabel()}
            className={toggleItemClassName}
          >
            {m.periods_weeks()}
          </ToggleGroupItem>
          <ToggleGroupItem
            value={SubscriptionPeriod.MONTH}
            data-id={SubscriptionPeriod.MONTH}
            aria-label={m.periods_months_ariaLabel()}
            className={toggleItemClassName}
          >
            {m.periods_months()}
          </ToggleGroupItem>
          <ToggleGroupItem
            value={SubscriptionPeriod.YEAR}
            data-id={SubscriptionPeriod.YEAR}
            aria-label={m.periods_years_ariaLabel()}
            className={toggleItemClassName}
          >
            {m.periods_years()}
          </ToggleGroupItem>
        </AnimatedBackground>
      </ToggleGroup>
    </div>
  );
};
