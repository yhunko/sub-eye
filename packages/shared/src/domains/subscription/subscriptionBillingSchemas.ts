import { type InferOutput, number, strictObject, string } from "valibot";

export const subscriptionBillingDetailsSchema = strictObject({
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

export type SubscriptionBillingDetails = InferOutput<
  typeof subscriptionBillingDetailsSchema
>;
