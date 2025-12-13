import * as v from "valibot";
import { Period } from "@/shared/lib/db";

export const AddSubscriptionSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty()),
  cost: v.string(),
  paymentDate: v.pipe(
    v.date(),
    v.transform((d) => d.toISOString()),
  ),
  period: v.enum(Period),
  currency: v.number(),
  every: v.pipe(
    v.string(),
    v.transform((i) => parseInt(i)),
  ),
});
export type AddSubscriptionInput = v.InferInput<typeof AddSubscriptionSchema>;
export type AddSubscriptionOutput = v.InferOutput<typeof AddSubscriptionSchema>;
