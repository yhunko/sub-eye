import { object, optional, picklist, string } from "valibot";

export const subscriptionSortFields = [
  "nextPaymentDate",
  "name",
  "cost",
] as const;
export type SubscriptionSortField = (typeof subscriptionSortFields)[number];

export const sortDirections = ["asc", "desc"] as const;
export type SortDirection = (typeof sortDirections)[number];

export const statusFilters = [
  "active",
  "paused",
  "cancelling",
  "cancelled",
  "all",
] as const;
export type StatusFilter = (typeof statusFilters)[number];

export type GetSubscriptionsParams = {
  sortBy?: SubscriptionSortField;
  direction?: SortDirection;
  search?: string;
  status?: StatusFilter;
  categoryId?: string;
  cursor?: string;
  limit?: number;
};

export const listQuerySchema = object({
  sortBy: optional(picklist(subscriptionSortFields)),
  direction: optional(picklist(sortDirections)),
  search: optional(string()),
  status: optional(picklist(statusFilters)),
  categoryId: optional(string()),
  cursor: optional(string()),
  limit: optional(string()),
});

export type SubscriptionListPageDto<TItem> = {
  items: TItem[];
  nextCursor: string | null;
};
