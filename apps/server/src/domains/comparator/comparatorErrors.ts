export class ComparatorQuotaExceededError extends Error {
  readonly status = 403 as const;
  constructor() {
    super("Comparator quota exceeded");
    this.name = "ComparatorQuotaExceededError";
  }
}

export class ComparatorSubscriptionNotFoundError extends Error {
  readonly status = 404 as const;
  constructor() {
    super("Subscription not found");
    this.name = "ComparatorSubscriptionNotFoundError";
  }
}
