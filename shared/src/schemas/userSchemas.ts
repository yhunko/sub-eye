import * as v from "valibot";

export const UpdateUserPublicMetadataSchema = v.object({
  preferredCurrency: v.optional(v.string()),
  preferredTimezone: v.optional(v.string()),
  notificationTime: v.optional(v.string()),
  notificationOffset: v.optional(v.number()),
  locale: v.optional(v.string()),
});

export type UpdateUserPublicMetadata = v.InferInput<
  typeof UpdateUserPublicMetadataSchema
>;
