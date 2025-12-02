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

type CurrencyInputProps = {
  InputProps: React.ComponentProps<"input">;
};

export function CurrencyInput({ InputProps }: CurrencyInputProps) {
  const [currency, setCurrency] = React.useState("$");

  return (
    <ButtonGroup className="w-full">
      <ButtonGroup className="w-full">
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="font-mono">{currency}</SelectTrigger>
          <SelectContent className="min-w-24">
            {/*TODO: Add currency list from API*/}
            {["UAH", "EUR", "$"].map((currency) => (
              <SelectItem key={currency} value={currency}>
                {currency}{" "}
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
