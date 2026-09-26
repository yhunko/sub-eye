import { SubscriptionPeriod } from "@subeye/model";

/**
 * The billing cycles people actually sign up on, in the order a checkout page
 * lists them.
 *
 * Keys, not sentences — like `form-schema`'s error codes, and for the same
 * reason: this module never imports the Paraglide runtime, which reaches
 * expo-localization and the native layer behind it, so it stays a plain unit
 * under test. `cadence-field` maps each key to its `m.form_cycle*` message.
 */
export const CYCLES = [
  { key: "daily", every: 1, period: SubscriptionPeriod.DAY },
  { key: "weekly", every: 1, period: SubscriptionPeriod.WEEK },
  { key: "biweekly", every: 2, period: SubscriptionPeriod.WEEK },
  { key: "monthly", every: 1, period: SubscriptionPeriod.MONTH },
  { key: "quarterly", every: 3, period: SubscriptionPeriod.MONTH },
  { key: "semiannual", every: 6, period: SubscriptionPeriod.MONTH },
  { key: "yearly", every: 1, period: SubscriptionPeriod.YEAR },
] as const;

export type CycleKey = (typeof CYCLES)[number]["key"];

// Every billing cycle anyone is actually on, and then some.
const COUNT_CEILING = 60;

/**
 * The preset this pair of form values IS, or `undefined` for a cadence only the
 * wheels can express.
 *
 * `every` arrives as the raw string the form holds, so "01" and " 1 " have to
 * miss: a preset claimed for a value the presets cannot produce would put the
 * menu and the wheels out of step the moment either one was touched.
 */
export function matchCycle(every: string, period: SubscriptionPeriod) {
  return CYCLES.find(
    (cycle) => String(cycle.every) === every.trim() && cycle.period === period,
  );
}

/**
 * The counts the custom wheel offers, with the form's own value carried in when
 * it sits outside them.
 *
 * A count above the ceiling is only reachable from the free-text field this
 * replaced. Dropping it would make the wheel display a number the form does not
 * hold — and the first flick would then commit that lie as the user's cadence.
 */
export function cycleCounts(every: string): number[] {
  const counts = Array.from({ length: COUNT_CEILING }, (_, i) => i + 1);
  const current = Number(every.trim());
  if (Number.isInteger(current) && current > COUNT_CEILING)
    counts.push(current);
  return counts;
}
