import * as v from "valibot";
import { Period } from "@/shared/lib/db";
import { BrandfetchSearchDto } from "@/entities/brandfetch/model/dtos";

export const AddSubscriptionFormSchema = v.object({
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
  brandDomain: v.optional(
    v.pipe(
      v.custom<BrandfetchSearchDto>((val) => {
        return typeof val === "object" && val !== null && "domain" in val;
      }, "Please select a valid brand"),
      v.transform((brand) => brand.domain),
    ),
  ),
});
export type AddSubscriptionInput = v.InferInput<
  typeof AddSubscriptionFormSchema
>;
export type AddSubscriptionOutput = v.InferOutput<
  typeof AddSubscriptionFormSchema
>;
