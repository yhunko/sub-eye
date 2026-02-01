import { FC, useMemo, useCallback } from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/shared/components";
import { CurrenciesMap } from "@shared/domains/currency";
import { CurrencyUtils } from "@shared/utils/currencyUtils";

import * as m from "@/i18n/messages";

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

  const selectedCurrency = useMemo(() => {
    return CurrenciesMap.get(CurrencyUtils.normalizeCode(value));
  }, [value]);

  const handleSelect = useCallback(
    (newValue: string) => {
      onChange?.(newValue);
    },
    [onChange],
  );

  return (
    <Select
      value={selectedCurrency?.code}
      onValueChange={handleSelect}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className="flex items-center font-mono"
        aria-label={m.components_currencySelect_ariaLabel({
          code: selectedCurrency?.code ?? "usd",
        })}
      >
        <span>{selectedCurrency?.flagEmoji}</span>
        <span>{selectedCurrency?.code}</span>
      </SelectTrigger>
      <SelectContent className="min-w-24" position="popper">
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
