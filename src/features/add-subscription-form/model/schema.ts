import * as v from "valibot";

export const AddSubscriptionSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  cost: v.string(),
  nextPaymentDate: v.date(),
  period: v.string(),
  every: v.pipe(
    v.string(),
    v.transform((i) => parseInt(i)),
  ),
});
export type AddSubscriptionInput = v.InferInput<typeof AddSubscriptionSchema>;
export type AddSubscriptionOutput = v.InferOutput<typeof AddSubscriptionSchema>;
