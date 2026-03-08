import { FC, useMemo } from "react";
import { CurrenciesMap, CurrencyUtils } from "shared";

type CurrencyTextProps = {
  currencyCode?: string;
  amount: number;
  className?: string;
};

export const CurrencyText: FC<CurrencyTextProps> = ({
  currencyCode,
  amount,
  className,
}) => {
  const currencyMetadata = useMemo(() => {
    return CurrenciesMap.get(CurrencyUtils.normalizeCode(currencyCode));
  }, [currencyCode]);

  if (!currencyMetadata) return null;

  const { symbol, format } = currencyMetadata;

  const formattedAmount = new Intl.NumberFormat(format, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <div className={className}>
      <span className="font-bold text-slate-600 dark:text-slate-300">
        {symbol}
      </span>
      <span className="font-semibold text-slate-700 dark:text-slate-200">
        {formattedAmount}
      </span>
    </div>
  );
};
