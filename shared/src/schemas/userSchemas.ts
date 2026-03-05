import * as v from "valibot";

export const UpdateUserPublicMetadataSchema = v.object({
  preferredCurrency: v.optional(v.string()),
  preferredTimezone: v.optional(v.string()),
  notificationTime: v.optional(
    v.pipe(
      v.string(),
      v.regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "notificationTime must use HH:mm (24-hour) format",
      ),
    ),
  ),
  notificationOffset: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(30)),
  ),
  locale: v.optional(
    v.pipe(
      v.string(),
      v.regex(
        /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/,
        "locale must be a valid BCP-47 language tag",
      ),
    ),
  ),
  preferredDateFormat: v.optional(v.string()),
});

export type UpdateUserPublicMetadata = v.InferInput<
  typeof UpdateUserPublicMetadataSchema
>;
