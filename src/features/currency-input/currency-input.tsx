"use client";

import * as React from "react";
import { ButtonGroup } from "@/shared/components";
import { Input } from "@/shared/components/ui/input";
import { CurrencySelect } from "../currency-select/currency-select";

type CurrencyInputProps = {
  InputProps: React.ComponentProps<"input">;
};

export function CurrencyInput({ InputProps }: CurrencyInputProps) {
  return (
    <ButtonGroup className="w-full">
      <ButtonGroup className="w-full">
        {/* TODO: Connect to BE */}
        <CurrencySelect />
        <Input type="number" {...InputProps} />
      </ButtonGroup>
    </ButtonGroup>
  );
}
