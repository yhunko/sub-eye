import type {
  StatusFilter,
  SubscriptionDto,
  SubscriptionSortField,
} from "shared";

type FilterParams = {
  search?: string;
  status?: StatusFilter;
  categoryId?: string;
  sortBy?: SubscriptionSortField;
  direction?: "asc" | "desc";
};

export function filterSubscriptions(
  subscriptions: SubscriptionDto[],
  params: FilterParams,
): SubscriptionDto[] {
  let filtered = [...subscriptions];

  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filtered = filtered.filter((sub) =>
      sub.name.toLowerCase().includes(searchLower),
    );
  }

  if (params.status && params.status !== "all") {
    filtered = filtered.filter((sub) => {
      if (params.status === "active") {
        return sub.status === "active";
      }
      if (params.status === "cancelled") {
        return (
          sub.status === "cancelled" || sub.status === "cancelledButActive"
        );
      }
      return true;
    });
  }

  if (params.categoryId) {
    filtered = filtered.filter((sub) => sub.categoryId === params.categoryId);
  }

  if (params.sortBy) {
    const direction = params.direction === "desc" ? -1 : 1;
    filtered.sort((a, b) => {
      switch (params.sortBy) {
        case "name":
          return direction * a.name.localeCompare(b.name);
        case "nextPaymentDate": {
          const dateA = new Date(a.nextPaymentDate).getTime();
          const dateB = new Date(b.nextPaymentDate).getTime();
          return direction * (dateA - dateB);
        }
        case "cost":
          return direction * (a.cost - b.cost);
        default:
          return 0;
      }
    });
  }

  return filtered;
}
