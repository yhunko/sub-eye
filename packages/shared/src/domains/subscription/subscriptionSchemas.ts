import {
  array,
  boolean,
  check,
  type InferOutput,
  integer,
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
} from "valibot";
import { SubscriptionPeriod } from "../../types";
import { PricePhaseDtoSchema, pricePhaseKinds } from "./pricePhaseSchemas";
import { subscriptionBillingDetailsSchema } from "./subscriptionBillingSchemas";
import { subscriptionLifecycleStatuses } from "./subscriptionLifecycle";

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

export const idQuerySchema = object({
  id: string(),
});
export type IdParam = InferOutput<typeof idQuerySchema>;

export const updateSubscriptionQuerySchema = object({
  trackHistory: optional(picklist(["true", "false"])),
});
export type UpdateSubscriptionQuery = InferOutput<
  typeof updateSubscriptionQuerySchema
>;

/**
 * Optional "starting offer" set up at creation time: begin the subscription on
 * a free trial or an intro discount. `cost` on the parent payload is the
 * standard price the offer reverts to; `promoCost` is the price paid until
 * `endsAt` (0 for a free trial).
 */
export const addSubscriptionIntroSchema = strictObject({
  kind: picklist(["trial", "intro"] as const),
  promoCost: pipe(number(), minValue(0)),
  endsAt: isoDateSchema,
});

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

/** Start a free (or reduced) trial that reverts to the standard price on `endsAt`. */
export const StartTrialSchema = strictObject({
  trialCost: optional(pipe(number(), minValue(0)), 0),
  trialCurrency: optional(currencyCodeSchema),
  endsAt: isoDateSchema,
  standardCost: positiveCostSchema,
  standardCurrency: optional(currencyCodeSchema),
});

/** Add a time-limited intro discount that reverts to the standard price on `endsAt`. */
export const AddIntroDiscountSchema = strictObject({
  introCost: positiveCostSchema,
  introCurrency: optional(currencyCodeSchema),
  endsAt: isoDateSchema,
  standardCost: positiveCostSchema,
  standardCurrency: optional(currencyCodeSchema),
});

export const cancelSubscriptionModes = ["periodEnd", "immediate"] as const;
export type CancelSubscriptionMode = (typeof cancelSubscriptionModes)[number];

export const CancelSubscriptionSchema = strictObject({
  mode: optional(picklist(cancelSubscriptionModes), "periodEnd"),
});

const scheduledPriceChangeSchema = strictObject({
  cost: number(),
  currency: string(),
  effectiveAt: string(),
  billing: subscriptionBillingDetailsSchema,
});

export const SubscriptionDtoSchema = strictObject({
  id: string(),
  userId: string(),
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
  qstashMessageId: nullable(string()),
  brandDomain: nullable(string()),
  billing: subscriptionBillingDetailsSchema,
  nextPaymentDate: string(),
  lastPaymentDate: nullable(string()),
  willBeCancelledAt: nullable(string()),
  scheduledPriceChange: nullable(scheduledPriceChangeSchema),
  pricePhases: array(PricePhaseDtoSchema),
  effectivePhaseKind: picklist(pricePhaseKinds),
  upcomingPhase: nullable(PricePhaseDtoSchema),
  status: picklist(subscriptionLifecycleStatuses),
});

export type AddSubscriptionInput = InferOutput<typeof AddSubscriptionSchema>;
export type UpdateSubscriptionInput = InferOutput<
  typeof UpdateSubscriptionSchema
>;
export type SchedulePriceChangeInput = InferOutput<
  typeof SchedulePriceChangeSchema
>;
export type StartTrialInput = InferOutput<typeof StartTrialSchema>;
export type AddIntroDiscountInput = InferOutput<typeof AddIntroDiscountSchema>;
export type CancelSubscriptionInput = InferOutput<
  typeof CancelSubscriptionSchema
>;
export type SubscriptionDto = InferOutput<typeof SubscriptionDtoSchema>;

export const PushSubscriptionSchema = strictObject({
  endpoint: pipe(
    string(),
    minLength(1),
    check(
      (value) => value.startsWith("https://"),
      "Push endpoint must use HTTPS",
    ),
  ),
  keys: strictObject({
    p256dh: pipe(string(), minLength(16)),
    auth: pipe(string(), minLength(8)),
  }),
});

export type PushSubscriptionInput = InferOutput<typeof PushSubscriptionSchema>;

export type PushNotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, unknown>;
};

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

export const BulkDeleteResponseSchema = strictObject({
  deletedCount: pipe(
    number(),
    check((value) => Number.isFinite(value) && value >= 0),
  ),
});

export const BulkUpdateCategoryResponseSchema = strictObject({
  updatedCount: pipe(
    number(),
    check((value) => Number.isFinite(value) && value >= 0),
  ),
});

export type BulkDeleteResponse = InferOutput<typeof BulkDeleteResponseSchema>;
export type BulkUpdateCategoryResponse = InferOutput<
  typeof BulkUpdateCategoryResponseSchema
>;
