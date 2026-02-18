import {
  boolean,
  check,
  integer,
  minLength,
  minValue,
  nullable,
  number,
  optional,
  picklist,
  pipe,
  string,
  strictObject,
  transform,
  type InferOutput,
  object,
} from "valibot";
import { SubscriptionPeriod } from "../../types";
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
  category: optional(
    nullable(
      pipe(
        string(),
        transform((value) => value.trim()),
      ),
    ),
    null,
  ),
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
  category: optional(
    nullable(
      pipe(
        string(),
        transform((value) => value.trim()),
      ),
    ),
  ),
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

const subscriptionBillingDetailsSchema = strictObject({
  original: strictObject({
    currencyCode: string(),
    monthly: number(),
  }),
  preferred: strictObject({
    currencyCode: string(),
    amount: number(),
    monthly: number(),
    yearly: number(),
    exchangeRate: number(),
  }),
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
  category: nullable(string()),
  notes: nullable(string()),
  createdAt: string(),
  updatedAt: string(),
  qstashMessageId: nullable(string()),
  brandDomain: nullable(string()),
  billing: subscriptionBillingDetailsSchema,
  nextPaymentDate: string(),
  lastPaymentDate: nullable(string()),
  willBeCancelledAt: nullable(string()),
  status: picklist(subscriptionLifecycleStatuses),
});

export type AddSubscriptionInput = InferOutput<typeof AddSubscriptionSchema>;
export type UpdateSubscriptionInput = InferOutput<
  typeof UpdateSubscriptionSchema
>;
export type SubscriptionBillingDetails = InferOutput<
  typeof subscriptionBillingDetailsSchema
>;
export type SubscriptionDto = InferOutput<typeof SubscriptionDtoSchema>;

export const PushSubscriptionSchema = strictObject({
  endpoint: string(),
  keys: strictObject({
    p256dh: string(),
    auth: string(),
  }),
});

export type PushSubscriptionInput = InferOutput<typeof PushSubscriptionSchema>;

export type PushNotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
};
