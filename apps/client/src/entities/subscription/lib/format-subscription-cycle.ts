import { SubscriptionPeriod } from "@subeye/shared";
import * as m from "@/i18n/messages";

const CYCLE_LABELS: Record<
  SubscriptionPeriod,
  { singular: string; plural: string }
> = {
  [SubscriptionPeriod.DAY]: {
    singular: m.periods_daily(),
    plural: m.periods_days(),
  },
  [SubscriptionPeriod.WEEK]: {
    singular: m.periods_weekly(),
    plural: m.periods_weeks(),
  },
  [SubscriptionPeriod.MONTH]: {
    singular: m.periods_monthly(),
    plural: m.periods_months(),
  },
  [SubscriptionPeriod.YEAR]: {
    singular: m.periods_yearly(),
    plural: m.periods_years(),
  },
};

export const formatSubscriptionCycle = (
  every: number | undefined,
  period: SubscriptionPeriod | undefined,
): string | null => {
  if (!every || !period) {
    return null;
  }

  const labels = CYCLE_LABELS[period];

  if (every === 1) {
    return labels.singular;
  }

  return `${every} ${labels.plural}`;
};
