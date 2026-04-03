import type * as React from "react";
import type { ReactNode } from "react";
import { ButtonGroup, Input } from "@/shared/components";

type CurrencyInputProps = {
  InputProps: React.ComponentProps<"input">;
  CurrencySelect: ReactNode;
  sanitizeValue?: (value: string) => string;
};

export function CurrencyInput({
  CurrencySelect,
  InputProps,
  sanitizeValue,
}: CurrencyInputProps) {
  const { onChange, onPaste, ...restInputProps } = InputProps;

  return (
    <ButtonGroup className="w-full">
      {CurrencySelect}
      <Input
        type="text"
        inputMode="decimal"
        {...restInputProps}
        onChange={(event) => {
          if (sanitizeValue) {
            const sanitized = sanitizeValue(event.target.value);
            if (sanitized !== event.target.value) {
              event.target.value = sanitized;
            }
          }

          onChange?.(event);
        }}
        onPaste={(event) => {
          if (!sanitizeValue) {
            onPaste?.(event);
            return;
          }

          event.preventDefault();

          const pasted = event.clipboardData.getData("text");
          const target = event.currentTarget;
          const selectionStart = target.selectionStart ?? target.value.length;
          const selectionEnd = target.selectionEnd ?? target.value.length;
          const combined = `${target.value.slice(0, selectionStart)}${pasted}${target.value.slice(selectionEnd)}`;

          target.value = sanitizeValue(combined);
          target.dispatchEvent(new Event("input", { bubbles: true }));

          onPaste?.(event);
        }}
      />
    </ButtonGroup>
  );
}
