import * as v from "valibot";
import { dateFormats } from "../utils/dateFormatUtils";

export const UpdateUserPreferencesSchema = v.object({
  preferredCurrency: v.optional(
    v.pipe(v.string(), v.minLength(3), v.maxLength(8)),
  ),
  preferredTimezone: v.optional(
    v.pipe(v.string(), v.minLength(1), v.maxLength(64)),
  ),
  dateFormat: v.optional(v.picklist(dateFormats)),
  locale: v.optional(
    v.pipe(
      v.string(),
      v.regex(
        /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/,
        "locale must be a valid BCP-47 language tag",
      ),
    ),
  ),
  theme: v.optional(v.picklist(["light", "dark", "system"] as const)),
});

export type UpdateUserPreferences = v.InferOutput<
  typeof UpdateUserPreferencesSchema
>;
