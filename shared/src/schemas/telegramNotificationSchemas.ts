import * as v from "valibot";

export const UpdateTelegramNotificationPreferencesSchema = v.object({
  enabled: v.boolean(),
});

export type UpdateTelegramNotificationPreferences = v.InferInput<
  typeof UpdateTelegramNotificationPreferencesSchema
>;

export const TelegramNotificationStatusSchema = v.object({
  linked: v.boolean(),
  enabled: v.boolean(),
  botUsername: v.nullable(v.string()),
  accountLabel: v.nullable(v.string()),
});

export type TelegramNotificationStatus = v.InferOutput<
  typeof TelegramNotificationStatusSchema
>;

export const TelegramLinkStartResponseSchema = v.object({
  connectUrl: v.string(),
  expiresAt: v.string(),
  botUsername: v.string(),
});

export type TelegramLinkStartResponse = v.InferOutput<
  typeof TelegramLinkStartResponseSchema
>;

export const TelegramSendReportSchema = v.object({
  attempted: v.number(),
  delivered: v.number(),
  failed: v.number(),
  skipped: v.number(),
  reason: v.optional(v.string()),
});

export type TelegramSendReport = v.InferOutput<typeof TelegramSendReportSchema>;
