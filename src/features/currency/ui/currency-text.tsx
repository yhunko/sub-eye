import { FC, useMemo } from "react";
import { CurrenciesMap } from "@/entities/monobank";
import { CurrencyUtils } from "@/shared/lib/currency.utils";

type CurrencyTextProps = {
  currencyCode?: number;
  amount: number;
};

export const CurrencyText: FC<CurrencyTextProps> = ({
  currencyCode,
  amount,
}) => {
  const currencyMetadata = useMemo(() => {
    return CurrenciesMap.get(
      currencyCode ?? CurrencyUtils.DEFAULT_CURRENCY_CODE,
    );
  }, [currencyCode]);

  if (!currencyMetadata) return null;

  const { symbol, format } = currencyMetadata;

  const formattedAmount = new Intl.NumberFormat(format, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <>
      <span className="font-mono text-sm font-bold text-slate-600 dark:text-slate-300">
        {symbol}
      </span>
      <span className="font-semibold text-slate-700 dark:text-slate-200">
        {formattedAmount}
      </span>
    </>
  );
};
