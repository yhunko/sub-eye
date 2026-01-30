import { object, optional, picklist, string } from "valibot";

export const subscriptionSortFields = [
  "nextPaymentDate",
  "name",
  "cost",
] as const;
export type SubscriptionSortField = (typeof subscriptionSortFields)[number];

export const sortDirections = ["asc", "desc"] as const;
export type SortDirection = (typeof sortDirections)[number];

export type GetSubscriptionsParams = {
  sortBy?: SubscriptionSortField;
  direction?: SortDirection;
  search?: string;
};

export const listQuerySchema = object({
  sortBy: optional(picklist(subscriptionSortFields)),
  direction: optional(picklist(sortDirections)),
  search: optional(string()),
});
