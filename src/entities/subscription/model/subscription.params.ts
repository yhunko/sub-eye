import { AddSubscriptionSchema } from "@/shared/lib/db/schema";
import { ColumnSort } from "@tanstack/table-core";

export type AddSubscriptionParams = Omit<AddSubscriptionSchema, "userId">;

export type SortDirection = "asc" | "desc";
export type SubscriptionSortField = "nextPaymentDate";

export type GetSubscriptionsParams = {
  sortBy?: SubscriptionSortField;
  direction?: SortDirection;
};

export type GetSubscriptionParams = {
  id: string;
};

export const defaultGetSubscriptionsParams: GetSubscriptionsParams = {
  sortBy: "nextPaymentDate",
  direction: "asc",
};
export const defaultSubscriptionsSortParams: ColumnSort = {
  id: "nextPaymentDate",
  desc: false,
};
