import { FC, useMemo, useCallback } from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/shared/components";
import { CurrenciesMap } from "@/entities/monobank";

export interface CurrencySelectProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  defaultValue?: number;
}

export const CurrencySelect: FC<CurrencySelectProps> = ({
  id,
  onChange,
  value,
  disabled = false,
}) => {
  const currencies = useMemo(() => Array.from(CurrenciesMap.entries()), []);

  const selectedCurrency = value.toString();

  const selectedCurrencyCode = useMemo(() => {
    const code = parseInt(selectedCurrency, 10);
    return CurrenciesMap.get(code)?.code ?? "???";
  }, [selectedCurrency]);

  const handleSelect = useCallback(
    (newValue: string) => {
      const parsed = parseInt(newValue, 10);
      if (!isNaN(parsed)) {
        onChange?.(parsed);
      }
    },
    [onChange],
  );

  return (
    <Select
      value={selectedCurrency}
      onValueChange={handleSelect}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className="font-mono"
        aria-label={`Select currency, currently ${selectedCurrencyCode}`}
      >
        {selectedCurrencyCode}
      </SelectTrigger>
      <SelectContent className="min-w-24">
        {currencies.map(([key, currency]) => {
          return (
            <SelectItem
              key={key}
              className="flex items-center"
              value={key.toString()}
            >
              <span>{currency.flagEmoji}</span>
              <span className="text-muted-foreground">
                {currency?.code ?? key}
              </span>
              <span className="sr-only">{currency?.code}</span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
