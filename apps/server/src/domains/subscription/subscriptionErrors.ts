export class SubscriptionNotFoundError extends Error {
  readonly status = 404 as const;
  constructor() {
    super("Subscription not found");
    this.name = "SubscriptionNotFoundError";
  }
}

export class SubscriptionHistoryItemNotFoundError extends Error {
  readonly status = 404 as const;
  constructor() {
    super("Subscription history item not found");
    this.name = "SubscriptionHistoryItemNotFoundError";
  }
}

export class SubscriptionLimitReachedError extends Error {
  readonly status = 403 as const;
  constructor() {
    super("Subscription limit reached");
    this.name = "SubscriptionLimitReachedError";
  }
}

export class SubscriptionCategoryNotFoundError extends Error {
  readonly status = 404 as const;
  constructor() {
    super("Category not found");
    this.name = "SubscriptionCategoryNotFoundError";
  }
}

export class CustomDateRequiredError extends Error {
  readonly status = 400 as const;
  constructor() {
    super("Custom date is required for custom-date mode");
    this.name = "CustomDateRequiredError";
  }
}

export class CannotScheduleCancelledError extends Error {
  readonly status = 400 as const;
  constructor() {
    super("Cannot schedule a price change for a cancelled subscription");
    this.name = "CannotScheduleCancelledError";
  }
}

export class InvalidScheduledDateError extends Error {
  readonly status = 400 as const;
  constructor() {
    super("Invalid scheduled effective date");
    this.name = "InvalidScheduledDateError";
  }
}

export class ScheduledDateMustBeFutureError extends Error {
  readonly status = 400 as const;
  constructor() {
    super("Scheduled effective date must be in the future");
    this.name = "ScheduledDateMustBeFutureError";
  }
}

export class ScheduledDateBeforeCancellationError extends Error {
  readonly status = 400 as const;
  constructor() {
    super("Scheduled effective date must be before the cancellation date");
    this.name = "ScheduledDateBeforeCancellationError";
  }
}

export class NoScheduledPriceChangeError extends Error {
  readonly status = 400 as const;
  constructor() {
    super("No scheduled price change");
    this.name = "NoScheduledPriceChangeError";
  }
}
