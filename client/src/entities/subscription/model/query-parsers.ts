import { parseAsString, parseAsStringLiteral } from "nuqs";
import type {
  SubscriptionSortField,
  SortDirection,
} from "@shared/domains/subscription";
import { statusFilters } from "@shared/domains/subscription";

const sortFields: SubscriptionSortField[] = ["nextPaymentDate", "name", "cost"];
const sortDirections: SortDirection[] = ["asc", "desc"];

export const subscriptionsQueryParsers = {
  search: parseAsString.withDefault(""),
  sortBy: parseAsStringLiteral(sortFields).withDefault("nextPaymentDate"),
  direction: parseAsStringLiteral(sortDirections).withDefault("asc"),
  status: parseAsStringLiteral(statusFilters).withDefault("active"),
};
