import { FC, useMemo, useCallback } from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/shared/components";
import { CurrenciesMap } from "@/entities/currency";
import { CurrencyUtils } from "@/shared/lib/currency.utils";

export interface CurrencySelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  defaultValue?: string;
}

export const CurrencySelect: FC<CurrencySelectProps> = ({
  id,
  onChange,
  value,
  disabled = false,
}) => {
  const currencies = useMemo(() => Array.from(CurrenciesMap.entries()), []);

  const selectedCurrency = CurrencyUtils.normalizeCode(value);

  const selectedCurrencyCode = useMemo(() => {
    return CurrenciesMap.get(selectedCurrency)?.code ?? "???";
  }, [selectedCurrency]);

  const handleSelect = useCallback(
    (newValue: string) => {
      onChange?.(newValue);
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
            <SelectItem key={key} className="flex items-center" value={key}>
              <span>{currency.flagEmoji}</span>
              <span className="text-muted-foreground ml-2">
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
