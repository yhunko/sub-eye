import type { SortDirection, SubscriptionSortField } from "@subeye/shared";
import { statusFilters } from "@subeye/shared";
import { parseAsString, parseAsStringLiteral } from "nuqs";

const sortFields: SubscriptionSortField[] = ["nextPaymentDate", "name", "cost"];
const sortDirections: SortDirection[] = ["asc", "desc"];

export const subscriptionsQueryParsers = {
  search: parseAsString.withDefault(""),
  sortBy: parseAsStringLiteral(sortFields).withDefault("nextPaymentDate"),
  direction: parseAsStringLiteral(sortDirections).withDefault("asc"),
  status: parseAsStringLiteral(statusFilters).withDefault("active"),
  categoryId: parseAsString.withDefault(""),
};
