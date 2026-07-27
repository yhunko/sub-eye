import type { ScheduledPriceChangeMode } from "@subeye/shared";
import { DateTimezoneUtils, RecurrenceUtils } from "@subeye/shared";
import {
  type RecurringSubscription,
  SubscriptionCalculator,
} from "@subeye/spend";
import { isSameDay } from "date-fns";

/** How the user asked for the new price to take effect. */
export type ScheduleEffectiveAtRequest = {
  mode: ScheduledPriceChangeMode;
  customDate?: string | null;
};

/** Floors a date to midnight *in the given timezone*, returned as an ISO instant. */
export const toStartOfDayInTimezone = (
  date: string,
  timezone?: string,
): string => {
  const zoned = DateTimezoneUtils.toZoned(date, timezone);
  zoned.setHours(0, 0, 0, 0);
  return zoned.toISOString();
};

export const isSameCalendarDayInTimezone = (
  left: string | Date,
  right: string | Date,
  timezone?: string,
): boolean =>
  isSameDay(
    DateTimezoneUtils.toZoned(left, timezone),
    DateTimezoneUtils.toZoned(right, timezone),
  );

/**
 * The instant of the subscription's next renewal.
 *
 * `calculatePaymentDates` returns today's renewal if one falls today, so if
 * that instant is already past we step forward one full period — a price
 * change must never be scheduled in the past.
 */
const resolveNextOccurrenceEffectiveAt = (
  subscription: RecurringSubscription,
  timezone?: string,
): string => {
  const { nextPaymentDate } = SubscriptionCalculator.calculatePaymentDates(
    subscription,
    timezone,
  );
  if (Date.parse(nextPaymentDate) > Date.now()) return nextPaymentDate;

  const nextOccurrence = RecurrenceUtils.addPeriod(
    DateTimezoneUtils.toZoned(nextPaymentDate, timezone),
    subscription.every,
    subscription.period,
    {
      anchorDate: DateTimezoneUtils.toZoned(subscription.paymentDate, timezone),
    },
  );
  return nextOccurrence.toISOString();
};

/**
 * Resolves when a scheduled price change should take effect.
 *
 * Returns `null` when `mode` is `"customDate"` and no `customDate` was supplied
 * — the caller in `apps/server` turns that into `CustomDateRequiredError`,
 * since a pure package cannot import server error classes.
 *
 * When a custom date falls on the same calendar day as the next renewal, the
 * exact renewal instant wins over midnight, so the boundary and the charge land
 * together rather than hours apart.
 */
export const resolveScheduledEffectiveAt = (
  subscription: RecurringSubscription,
  request: ScheduleEffectiveAtRequest,
  timezone?: string,
): string | null => {
  if (request.mode === "nextOccurrence") {
    return resolveNextOccurrenceEffectiveAt(subscription, timezone);
  }
  if (!request.customDate) return null;

  const customEffectiveAt = toStartOfDayInTimezone(
    request.customDate,
    timezone,
  );
  const nextOccurrenceEffectiveAt = resolveNextOccurrenceEffectiveAt(
    subscription,
    timezone,
  );
  if (
    isSameCalendarDayInTimezone(
      customEffectiveAt,
      nextOccurrenceEffectiveAt,
      timezone,
    )
  ) {
    return nextOccurrenceEffectiveAt;
  }
  return customEffectiveAt;
};

/** Normalizes a date-ish value to an ISO string, or `null` for null-ish input. */
export const normalizeIsoDate = (
  value?: string | Date | null,
): string | null => {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
};

/**
 * Formats a money amount for the `numeric(10,2)` column. Always exactly two
 * decimals — the column is compared as a string, so "12" and "12.00" would
 * otherwise not be equal.
 */
export const normalizeAmount = (value: number): string => value.toFixed(2);
