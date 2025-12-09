"use client";

import * as React from "react";
import {
  ButtonGroup,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/shared/components";
import { Input } from "@/shared/components/ui/input";
import { CurrenciesMap } from "@/entities/monobank";

type CurrencyInputProps = {
  InputProps: React.ComponentProps<"input">;
};

export function CurrencyInput({ InputProps }: CurrencyInputProps) {
  const [selectedCurrency, setSelectedCurrency] = React.useState<string>(
    CurrenciesMap.keys().toArray()[0].toString(),
  );

  const c = selectedCurrency
    ? CurrenciesMap.get(parseInt(selectedCurrency))
    : "";

  return (
    <ButtonGroup className="w-full">
      <ButtonGroup className="w-full">
        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
          <SelectTrigger className="font-mono">{c}</SelectTrigger>
          <SelectContent className="min-w-24">
            {CurrenciesMap.entries()
              .toArray()
              .map(([key, currency]) => (
                <SelectItem key={key} value={key.toString()}>
                  <span className="text-muted-foreground">{currency}</span>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Input type="number" {...InputProps} />
      </ButtonGroup>
    </ButtonGroup>
  );
}
