import * as v from "valibot";
import { BrandfetchSearchDto } from "@/entities/brandfetch/model/dtos";
import { SubscriptionPeriod } from "@shared/types";

export const addSubscriptionFormSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Name is required")),
  cost: v.pipe(
    v.string(),
    v.minLength(1, "Cost is required"),
    v.transform((value) => Number(value)),
  ),
  paymentDate: v.pipe(
    v.date(),
    v.transform((value) => value.getTime()),
  ),
  every: v.pipe(
    v.string(),
    v.minLength(1, "Billing cycle is required"),
    v.transform((value) => Number(value)),
  ),
  period: v.enum_(SubscriptionPeriod),
  currency: v.pipe(v.string(), v.minLength(1, "Currency is required")),
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
  typeof addSubscriptionFormSchema
>;
export type AddSubscriptionOutput = v.InferOutput<
  typeof addSubscriptionFormSchema
>;

export const useAddSubscriptionFormSchema = () => addSubscriptionFormSchema;
