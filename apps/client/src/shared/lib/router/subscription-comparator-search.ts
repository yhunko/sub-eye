import { object, optional, string } from "valibot";

export const subscriptionComparatorSearchSchema = object({
  prefillId: optional(string()),
  draft: optional(string()),
});

export type SubscriptionComparatorSearch = {
  prefillId?: string;
  draft?: string;
};
