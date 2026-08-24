import {
  array,
  boolean,
  check,
  type InferOutput,
  integer,
  literal,
  maxLength,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  picklist,
  pipe,
  strictObject,
  string,
  transform,
  variant,
} from "valibot";
import { SubscriptionPeriod } from "../../types";
import { PricePhaseDtoSchema, pricePhaseKinds } from "./pricePhaseSchemas";
import { subscriptionBillingDetailsSchema } from "./subscriptionBillingSchemas";
import {
  subscriptionAllowedActions,
  subscriptionStatuses,
} from "./subscriptionStatus";

const currencyCodeSchema = pipe(
  string(),
  transform((value) => value.trim().toLowerCase()),
  minLength(3),
);

const subscriptionPeriodSchema = picklist([
  SubscriptionPeriod.DAY,
  SubscriptionPeriod.WEEK,
  SubscriptionPeriod.MONTH,
  SubscriptionPeriod.YEAR,
]);

const isoDateSchema = pipe(
  string(),
  minLength(1),
  check((value) => !Number.isNaN(Date.parse(value)), "Invalid date"),
);

/**
 * An ISO date that must still be ahead of us — a BACKSTOP, not the UX rule.
 *
 * Compared against the START of the current UTC day, the mirror of
 * `pastIsoDateSchema` below and for the same reason: a picker hands back a
 * calendar day at midnight, and a user west of UTC is on a day the server has
 * already left. At 20:00 in UTC-5 the server's "now" is tomorrow, so a strict
 * `> Date.now()` rejected the user's *tomorrow* — the one date they wanted, and
 * the only one the control let them pick.
 *
 * Rejecting only what is unambiguously past costs at most a day of slack here.
 * The real rule is `isFutureDay` on the client, which knows the device's own
 * calendar and enforces "strictly after today" in it.
 */
const futureIsoDateSchema = pipe(
  isoDateSchema,
  check((value) => {
    const startOfUtcToday = new Date();
    startOfUtcToday.setUTCHours(0, 0, 0, 0);
    return Date.parse(value) >= startOfUtcToday.getTime();
  }, "Date must be in the future"),
);

/**
 * An ISO date that must already have happened.
 *
 * Compared against the END of the current UTC day, not the current instant: a
 * date picker hands back midnight, so "today" is behind `Date.now()` by however
 * far into the day it is — but a user east of UTC can legitimately be on a
 * calendar day the server has not reached yet, and rejecting their "today" is
 * the one failure this schema must not produce.
 */
const pastIsoDateSchema = pipe(
  isoDateSchema,
  check((value) => {
    const endOfUtcToday = new Date();
    endOfUtcToday.setUTCHours(23, 59, 59, 999);
    return Date.parse(value) <= endOfUtcToday.getTime();
  }, "Date cannot be in the future"),
);

export const idQuerySchema = object({
  id: string(),
});

/**
 * Optional "starting offer" set up at creation time: begin the subscription on
 * a free trial or an intro discount. `cost` on the parent payload is the
 * standard price the offer reverts to; `promoCost` is the price paid until
 * `endsAt` (0 for a free trial).
 */
export const addSubscriptionIntroSchema = pipe(
  strictObject({
    kind: picklist(["trial", "intro"] as const),
    promoCost: pipe(number(), minValue(0)),
    endsAt: futureIsoDateSchema,
  }),
  // A "discount" of zero is a free trial. Forcing the distinction keeps the
  // timeline honest about what the user actually signed up for.
  check(
    (value) => value.kind !== "intro" || value.promoCost > 0,
    "An intro discount must cost more than zero",
  ),
);

export const AddSubscriptionSchema = strictObject({
  name: pipe(
    string(),
    transform((value) => value.trim()),
    minLength(1),
  ),
  cost: pipe(number(), minValue(0)),
  currency: currencyCodeSchema,
  every: optional(pipe(number(), integer(), minValue(1)), 1),
  period: optional(subscriptionPeriodSchema, SubscriptionPeriod.MONTH),
  paymentDate: isoDateSchema,
  autoPaid: optional(boolean(), false),
  categoryId: optional(nullable(string()), null),
  notes: optional(
    nullable(
      pipe(
        string(),
        transform((value) => value.trim()),
      ),
    ),
    null,
  ),
  brandDomain: optional(
    nullable(
      pipe(
        string(),
        transform((value) => value.trim()),
      ),
    ),
    null,
  ),
  willBeCancelledAt: optional(nullable(isoDateSchema), null),
  intro: optional(nullable(addSubscriptionIntroSchema)),
});

export const UpdateSubscriptionSchema = strictObject({
  name: optional(
    pipe(
      string(),
      transform((value) => value.trim()),
      minLength(1),
    ),
  ),
  cost: optional(pipe(number(), minValue(0))),
  currency: optional(currencyCodeSchema),
  every: optional(pipe(number(), integer(), minValue(1))),
  period: optional(subscriptionPeriodSchema),
  paymentDate: optional(isoDateSchema),
  autoPaid: optional(boolean()),
  categoryId: optional(nullable(string())),
  notes: optional(
    nullable(
      pipe(
        string(),
        transform((value) => value.trim()),
      ),
    ),
  ),
  brandDomain: optional(
    nullable(
      pipe(
        string(),
        transform((value) => value.trim()),
      ),
    ),
  ),
  willBeCancelledAt: optional(nullable(isoDateSchema)),
});

export const scheduledPriceChangeModes = [
  "nextOccurrence",
  "customDate",
] as const;
export type ScheduledPriceChangeMode =
  (typeof scheduledPriceChangeModes)[number];

export const SchedulePriceChangeSchema = strictObject({
  mode: picklist(scheduledPriceChangeModes),
  scheduledCost: pipe(
    number(),
    check((value) => value > 0, "Cost must be greater than zero"),
  ),
  scheduledCurrency: optional(currencyCodeSchema),
  customDate: optional(nullable(isoDateSchema)),
});

const positiveCostSchema = pipe(
  number(),
  check((value) => value > 0, "Cost must be greater than zero"),
);

/**
 * One payload for every way of putting a price on the timeline:
 *  - `trial` / `intro` start an override now that reverts to `standardCost`
 *    on `endsAt`;
 *  - `scheduledChange` replaces the standard price on a future date.
 */
export const StartPhaseSchema = variant("kind", [
  strictObject({
    kind: literal("trial"),
    promoCost: pipe(number(), minValue(0)),
    currency: optional(currencyCodeSchema),
    endsAt: futureIsoDateSchema,
    standardCost: positiveCostSchema,
  }),
  strictObject({
    kind: literal("intro"),
    promoCost: positiveCostSchema,
    currency: optional(currencyCodeSchema),
    endsAt: futureIsoDateSchema,
    standardCost: positiveCostSchema,
  }),
  strictObject({
    kind: literal("scheduledChange"),
    cost: positiveCostSchema,
    currency: optional(currencyCodeSchema),
    mode: picklist(scheduledPriceChangeModes),
    customDate: optional(nullable(isoDateSchema)),
  }),
]);
export type StartPhaseInput = InferOutput<typeof StartPhaseSchema>;

export const cancelSubscriptionModes = ["periodEnd", "immediate"] as const;
export type CancelSubscriptionMode = (typeof cancelSubscriptionModes)[number];

export const CancelSubscriptionSchema = strictObject({
  mode: optional(picklist(cancelSubscriptionModes), "periodEnd"),
});

/** Pause a subscription, optionally until a known resume date. */
export const PauseSubscriptionSchema = strictObject({
  resumeAt: optional(nullable(isoDateSchema), null),
});
export type PauseSubscriptionInput = InferOutput<
  typeof PauseSubscriptionSchema
>;

/**
 * Un-cancel, optionally re-anchoring the billing cycle to the day the
 * subscription actually started again.
 *
 * `paymentDate` is only meaningful for a subscription that has already ENDED: a
 * still-winding-down one never stopped billing, so re-anchoring it would move a
 * cycle that was never interrupted. Omit it there.
 *
 * The date cannot be in the future, because this records a restart that has
 * already happened. The past is explicitly allowed — someone who resubscribed
 * three weeks ago and only now opened the app has to be able to say so, or
 * every projected payment lands three weeks late.
 */
export const RenewSubscriptionSchema = strictObject({
  paymentDate: optional(nullable(pastIsoDateSchema), null),
});
export type RenewSubscriptionInput = InferOutput<
  typeof RenewSubscriptionSchema
>;

const scheduledPriceChangeSchema = strictObject({
  cost: number(),
  currency: string(),
  effectiveAt: string(),
  billing: subscriptionBillingDetailsSchema,
});

export const SubscriptionDtoSchema = strictObject({
  id: string(),
  name: string(),
  cost: number(),
  currency: string(),
  every: number(),
  period: subscriptionPeriodSchema,
  paymentDate: string(),
  autoPaid: boolean(),
  categoryId: nullable(string()),
  notes: nullable(string()),
  createdAt: string(),
  updatedAt: string(),
  brandDomain: nullable(string()),
  billing: subscriptionBillingDetailsSchema,
  nextPaymentDate: string(),
  lastPaymentDate: nullable(string()),
  willBeCancelledAt: nullable(string()),
  scheduledPriceChange: nullable(scheduledPriceChangeSchema),
  pricePhases: array(PricePhaseDtoSchema),
  effectivePhaseKind: picklist(pricePhaseKinds),
  upcomingPhase: nullable(PricePhaseDtoSchema),
  status: picklist(subscriptionStatuses),
  pausedAt: nullable(string()),
  resumeAt: nullable(string()),
  allowedActions: array(picklist(subscriptionAllowedActions)),
  category: nullable(
    strictObject({ id: string(), name: string(), emoji: string() }),
  ),
});

export type AddSubscriptionInput = InferOutput<typeof AddSubscriptionSchema>;
export type UpdateSubscriptionInput = InferOutput<
  typeof UpdateSubscriptionSchema
>;
export type SchedulePriceChangeInput = InferOutput<
  typeof SchedulePriceChangeSchema
>;
export type SubscriptionDto = InferOutput<typeof SubscriptionDtoSchema>;

export const BulkDeleteSubscriptionsSchema = strictObject({
  ids: pipe(array(pipe(string(), minLength(1))), minLength(1), maxLength(500)),
});

export const BulkUpdateCategorySchema = strictObject({
  ids: pipe(array(pipe(string(), minLength(1))), minLength(1), maxLength(500)),
  categoryId: nullable(string()),
});

export type BulkDeleteSubscriptionsInput = InferOutput<
  typeof BulkDeleteSubscriptionsSchema
>;
export type BulkUpdateCategoryInput = InferOutput<
  typeof BulkUpdateCategorySchema
>;
