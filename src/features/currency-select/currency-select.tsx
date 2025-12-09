import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/shared/components";
import { CurrenciesMap } from "@/entities/monobank";
import * as React from "react";
import { FC } from "react";
import { useUncontrolled } from "@mantine/hooks";

type CurrencySelectProps = {
  id?: string;
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
};

export const CurrencySelect: FC<CurrencySelectProps> = ({
  id,
  onChange,
  value,
  disabled,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useUncontrolled({
    value: value?.toString(),
    onChange: (newValue) => {
      onChange?.(parseInt(newValue, 10));
    },
    defaultValue: "840",
  });

  return (
    <Select
      value={selectedCurrency}
      onValueChange={setSelectedCurrency}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="font-mono">
        {CurrenciesMap.get(parseInt(selectedCurrency, 10))}
      </SelectTrigger>
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
  );
};
