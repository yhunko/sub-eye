import { FC, useMemo } from "react";
import { useUncontrolled } from "@mantine/hooks";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/shared/components";
import { CurrenciesMap } from "@/entities/monobank";

export interface CurrencySelectProps {
  id?: string;
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  defaultValue?: number;
}

export const CurrencySelect: FC<CurrencySelectProps> = ({
  id,
  onChange,
  value,
  disabled = false,
  defaultValue = 840,
}) => {
  const currencies = useMemo(() => Array.from(CurrenciesMap.entries()), []);

  const [selectedCurrency, setSelectedCurrency] = useUncontrolled({
    value: value?.toString(),
    onChange: (newValue) => {
      const parsed = parseInt(newValue, 10);
      if (!isNaN(parsed)) {
        onChange?.(parsed);
      }
    },
    defaultValue: defaultValue.toString(),
  });

  const selectedCurrencyCode = useMemo(() => {
    const code = parseInt(selectedCurrency, 10);
    return CurrenciesMap.get(code)?.code ?? "???";
  }, [selectedCurrency]);

  return (
    <Select
      value={selectedCurrency}
      onValueChange={setSelectedCurrency}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="font-mono" aria-label="Select currency">
        {selectedCurrencyCode}
      </SelectTrigger>
      <SelectContent className="min-w-24">
        {currencies.map(([key, currency]) => (
          <SelectItem key={key} value={key.toString()}>
            <span className="text-muted-foreground">
              {currency?.code ?? key}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
