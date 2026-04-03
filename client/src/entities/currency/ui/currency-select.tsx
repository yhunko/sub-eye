import { type FC, useCallback, useMemo } from "react";
import { CurrenciesMap, CurrencyUtils } from "shared";
import * as m from "@/i18n/messages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/shared/components";

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

  const selectedCurrencyKey = useMemo(() => {
    const normalized = CurrencyUtils.normalizeCode(value);
    return CurrenciesMap.has(normalized)
      ? normalized
      : CurrencyUtils.DEFAULT_CURRENCY_CODE;
  }, [value]);

  const selectedCurrency = useMemo(() => {
    return CurrenciesMap.get(selectedCurrencyKey);
  }, [selectedCurrencyKey]);

  const handleSelect = useCallback(
    (newValue: string) => {
      if (!newValue) return;

      onChange?.(newValue);
    },
    [onChange],
  );

  return (
    <Select
      value={selectedCurrencyKey}
      onValueChange={handleSelect}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className="flex items-center font-mono"
        aria-label={m.components_currencySelect_ariaLabel({
          code: selectedCurrency?.code ?? "USD",
        })}
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">{selectedCurrency?.flagEmoji}</span>
          <span>{selectedCurrency?.code}</span>
        </span>
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
