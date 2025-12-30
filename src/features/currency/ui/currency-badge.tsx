import { FC, useMemo } from "react";
import { CurrenciesMap } from "@/entities/monobank";

type CurrencyBadgeProps = {
  currencyCode: number;
  amount: number;
};

export const CurrencyBadge: FC<CurrencyBadgeProps> = ({
  amount,
  currencyCode,
}) => {
  const currencyMetadata = useMemo(() => {
    return CurrenciesMap.get(currencyCode);
  }, [currencyCode]);

  if (!currencyMetadata) return null;

  const { symbol, format } = currencyMetadata;

  const formattedAmount = new Intl.NumberFormat(format, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <div className="pointer-events-none inline-flex h-6 items-center gap-1 rounded-md border border-slate-200 bg-linear-to-br from-slate-50 to-slate-100 px-2 text-xs shadow-sm transition-shadow hover:shadow dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
      <span className="font-mono text-sm font-bold text-slate-600 dark:text-slate-300">
        {symbol}
      </span>
      <span className="font-semibold text-slate-700 dark:text-slate-200">
        {formattedAmount}
      </span>
    </div>
  );
};
