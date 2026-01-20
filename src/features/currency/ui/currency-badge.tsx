import { FC } from "react";
import { CurrencyText } from "./currency-text";

type CurrencyBadgeProps = {
  currencyCode: string;
  amount: number;
};

export const CurrencyBadge: FC<CurrencyBadgeProps> = ({
  amount,
  currencyCode,
}) => {
  return (
    <div className="pointer-events-none inline-flex h-6 items-center gap-1 rounded-md border border-slate-200 bg-linear-to-br from-slate-50 to-slate-100 px-2 text-xs shadow-sm transition-shadow hover:shadow dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
      <CurrencyText amount={amount} currencyCode={currencyCode} />
    </div>
  );
};
