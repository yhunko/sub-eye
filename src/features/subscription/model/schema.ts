import * as v from "valibot";
import { Period } from "@/shared/lib/db";
import { BrandfetchSearchDto } from "@/entities/brandfetch/model/dtos";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

export const useAddSubscriptionFormSchema = () => {
  const t = useTranslations("common.errors");

  return useMemo(
    () =>
      v.object({
        name: v.pipe(v.string(), v.nonEmpty(t("nameRequired"))),
        cost: v.pipe(
          v.string(),
          v.check((input) => !isNaN(parseFloat(input)), t("costInvalid")),
          v.check((input) => parseFloat(input) > 0, t("costPositive")),
          v.transform((input) => parseFloat(input).toFixed(2)),
        ),
        paymentDate: v.pipe(
          v.date(),
          v.transform((d) => d.toISOString()),
        ),
        period: v.enum(Period),
        currency: v.string(),
        every: v.pipe(
          v.string(),
          v.check((input) => /^\d+$/.test(input), t("mustBeWholeNumber")),
          v.transform((i) => parseInt(i, 10)),
          v.minValue(1, t("intervalMin")),
        ),
        brandDomain: v.optional(
          v.pipe(
            v.custom<BrandfetchSearchDto>((val) => {
              return typeof val === "object" && val !== null && "domain" in val;
            }, t("validBrand")),
            v.transform((brand) => brand.domain),
          ),
        ),
      }),
    [t],
  );
};

export type AddSubscriptionInput = v.InferInput<
  ReturnType<typeof useAddSubscriptionFormSchema>
>;
export type AddSubscriptionOutput = v.InferOutput<
  ReturnType<typeof useAddSubscriptionFormSchema>
>;
