import { AddSubscriptionSchema } from "@/shared/lib/db/schema";

export type AddSubscriptionParams = Omit<AddSubscriptionSchema, "userId">;

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

export type GetSubscriptionParams = {
  id: string;
};
