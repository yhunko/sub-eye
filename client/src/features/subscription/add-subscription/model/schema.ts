import * as v from "valibot";
import { BrandfetchSearchDto } from "@/entities/brandfetch/model/dtos";
import { SubscriptionPeriod } from "shared";
import * as m from "@/i18n/messages";
import { parsePriceInput } from "@/shared/lib/price-input";

export const createAddSubscriptionFormSchema = () =>
  v.object({
    name: v.pipe(
      v.string(m.validation_required()),
      v.nonEmpty(m.validation_required()),
      v.transform((value) => value.trim()),
    ),
    cost: v.pipe(
      v.string(),
      v.check(
        (input) => parsePriceInput(input) !== null,
        m.validation_invalid_number(),
      ),
      v.transform((input) => parsePriceInput(input) ?? Number.NaN),
      v.check((input) => Number.isFinite(input), m.validation_invalid_number()),
      v.check((input) => input > 0, m.validation_positive_number()),
    ),
    paymentDate: v.pipe(v.date(m.validation_invalid_date())),
    every: v.pipe(
      v.string(),
      v.check((input) => /^\d+$/.test(input), m.validation_whole_number()),
      v.transform((i) => parseInt(i, 10)),
      v.minValue(1, m.validation_min_value({ min: 1 })),
    ),
    period: v.enum(SubscriptionPeriod),
    currency: v.pipe(v.string(), v.minLength(1, m.validation_required())),
    brandDomain: v.nullish(
      v.pipe(
        v.custom<BrandfetchSearchDto>((val) => {
          return typeof val === "object" && val !== null && "domain" in val;
        }, m.validation_brand_invalid()),
        v.transform((brand) => brand.domain),
      ),
    ),
    categoryId: v.nullish(v.string()),
  });

export type AddSubscriptionFormSchema = ReturnType<
  typeof createAddSubscriptionFormSchema
>;

export type AddSubscriptionInput = v.InferInput<AddSubscriptionFormSchema>;
export type AddSubscriptionOutput = v.InferOutput<AddSubscriptionFormSchema>;
