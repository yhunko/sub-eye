import {
  any,
  type InferOutput,
  nullable,
  picklist,
  strictObject,
  string,
} from "valibot";

export const FREE_SUBSCRIPTION_HISTORY_LIMIT = 3;

export const subscriptionActionEnumArr = [
  "created",
  "updated",
  "cancelled",
  "renewed",
  "deleted",
  "uncancelled",
] as const;

export type SubscriptionAction = (typeof subscriptionActionEnumArr)[number];

export const SubscriptionHistoryDtoSchema = strictObject({
  id: string(),
  subscriptionId: nullable(string()),
  userId: string(),
  action: picklist(subscriptionActionEnumArr),
  snapshot: any(),
  createdAt: string(),
});

export type SubscriptionHistoryDto = InferOutput<
  typeof SubscriptionHistoryDtoSchema
>;
