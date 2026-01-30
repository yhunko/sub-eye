import * as React from "react";
import { ReactNode } from "react";
import { ButtonGroup, Input } from "@/shared/components";

type CurrencyInputProps = {
  InputProps: React.ComponentProps<"input">;
  CurrencySelect: ReactNode;
};

export function CurrencyInput({
  CurrencySelect,
  InputProps,
}: CurrencyInputProps) {
  return (
    <ButtonGroup className="w-full">
      {CurrencySelect}
      <Input type="number" {...InputProps} />
    </ButtonGroup>
  );
}
