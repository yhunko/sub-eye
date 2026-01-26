import { parseAsString, parseAsStringLiteral } from "nuqs/server";
import {
  SortDirection,
  SubscriptionSortField,
  sortDirections,
  subscriptionSortFields,
} from "@/entities/subscription";

export const subscriptionsQueryParsers = {
  search: parseAsString.withDefault(""),
  sortBy: parseAsStringLiteral(subscriptionSortFields).withDefault(
    "nextPaymentDate",
  ),
  direction: parseAsStringLiteral(sortDirections).withDefault("asc"),
};

export type SubscriptionsQueryState = {
  search: string;
  sortBy: SubscriptionSortField;
  direction: SortDirection;
};
