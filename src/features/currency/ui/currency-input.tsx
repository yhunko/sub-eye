"use client";

import * as React from "react";
import { ReactNode } from "react";
import { ButtonGroup } from "@/shared/components";
import { Input } from "@/shared/components/ui/input";

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
      <ButtonGroup className="w-full">
        {CurrencySelect}
        <Input type="number" {...InputProps} />
      </ButtonGroup>
    </ButtonGroup>
  );
}
