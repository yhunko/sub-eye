import * as v from "valibot";

export const TELEGRAM_TEMPLATE_VARIABLES = [
  "subscription_name",
  "renewal_relative_day",
  "price_preferred",
  "price_original",
  "renewal_date",
] as const;

export const TelegramTemplateVariableSchema = v.picklist(
  TELEGRAM_TEMPLATE_VARIABLES,
);

export type TelegramTemplateVariable = v.InferOutput<
  typeof TelegramTemplateVariableSchema
>;

export const TelegramMessageTemplateSchema = v.object({
  version: v.literal(1),
  template: v.pipe(v.string(), v.minLength(1), v.maxLength(2000)),
});

export type TelegramMessageTemplate = v.InferOutput<
  typeof TelegramMessageTemplateSchema
>;

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
  messageTemplate: TelegramMessageTemplateSchema,
  defaultMessageTemplate: TelegramMessageTemplateSchema,
  isCustomTemplate: v.boolean(),
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

export const UpdateTelegramMessageTemplateSchema = v.object({
  messageTemplate: TelegramMessageTemplateSchema,
});

export type UpdateTelegramMessageTemplate = v.InferInput<
  typeof UpdateTelegramMessageTemplateSchema
>;

export const TelegramSendReportSchema = v.object({
  attempted: v.number(),
  delivered: v.number(),
  failed: v.number(),
  skipped: v.number(),
  reason: v.optional(v.string()),
});

export type TelegramSendReport = v.InferOutput<typeof TelegramSendReportSchema>;
