import * as v from "valibot";
import { Period } from "@/shared/lib/db";
import { BrandfetchSearchDto } from "@/entities/brandfetch/model/dtos";

export const AddSubscriptionFormSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty("Name is required")),
  cost: v.pipe(
    v.string(),
    v.check(
      (input) => !isNaN(parseFloat(input)),
      "Cost must be a valid number",
    ),
    v.check(
      (input) => parseFloat(input) > 0,
      "Cost cannot be zero or negative",
    ),
    v.transform((input) => parseFloat(input).toFixed(2)),
  ),
  paymentDate: v.pipe(
    v.date(),
    v.transform((d) => d.toISOString()),
  ),
  period: v.enum(Period),
  currency: v.number(),
  every: v.pipe(
    v.string(),
    v.check((input) => /^\d+$/.test(input), "Must be a whole number"),
    v.transform((i) => parseInt(i, 10)),
    v.minValue(1, "Interval must be at least 1"),
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
