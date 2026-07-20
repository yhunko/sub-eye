import { SubscriptionPeriod } from "@subeye/shared";
import * as v from "valibot";
import type { BrandfetchSearchDto } from "@/entities/brandfetch";
import * as m from "@/i18n/messages";
import { parsePriceInput } from "@/shared/lib/price-input";

export const createAddSubscriptionFormSchema = () =>
  v.pipe(
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
        v.check(
          (input) => Number.isFinite(input),
          m.validation_invalid_number(),
        ),
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
      // Optional "starting offer" — begin on a free trial or intro discount.
      introMode: v.optional(v.picklist(["none", "trial", "intro"]), "none"),
      introCost: v.optional(v.string(), ""),
      introEndsAt: v.optional(v.nullable(v.date()), null),
    }),
    v.forward(
      v.check(
        (data) =>
          data.introMode === "none" ||
          (data.introEndsAt instanceof Date &&
            data.introEndsAt.getTime() > Date.now()),
        m.validation_future_date(),
      ),
      ["introEndsAt"],
    ),
    v.forward(
      v.check(
        (data) =>
          data.introMode !== "intro" ||
          (parsePriceInput(data.introCost) ?? 0) > 0,
        m.validation_positive_number(),
      ),
      ["introCost"],
    ),
  );

export type AddSubscriptionFormSchema = ReturnType<
  typeof createAddSubscriptionFormSchema
>;

export type AddSubscriptionInput = v.InferInput<AddSubscriptionFormSchema>;
export type AddSubscriptionOutput = v.InferOutput<AddSubscriptionFormSchema>;
