import type { ApiErrorCode } from "@subeye/model";

export class SubscriptionNotFoundError extends Error {
  readonly status = 404 as const;
  readonly code: ApiErrorCode = "SUBSCRIPTION_NOT_FOUND";
  constructor() {
    super("Subscription not found");
    this.name = "SubscriptionNotFoundError";
  }
}

export class SubscriptionCategoryNotFoundError extends Error {
  readonly status = 404 as const;
  readonly code: ApiErrorCode = "CATEGORY_NOT_FOUND";
  constructor() {
    super("Category not found");
    this.name = "SubscriptionCategoryNotFoundError";
  }
}

export class CustomDateRequiredError extends Error {
  readonly status = 400 as const;
  readonly code: ApiErrorCode = "CUSTOM_DATE_REQUIRED";
  constructor() {
    super("Custom date is required for custom-date mode");
    this.name = "CustomDateRequiredError";
  }
}

export class CannotScheduleCancelledError extends Error {
  readonly status = 400 as const;
  readonly code: ApiErrorCode = "CANNOT_SCHEDULE_CANCELLED";
  constructor() {
    super("Cannot schedule a price change for a cancelled subscription");
    this.name = "CannotScheduleCancelledError";
  }
}

export class InvalidScheduledDateError extends Error {
  readonly status = 400 as const;
  readonly code: ApiErrorCode = "INVALID_SCHEDULED_DATE";
  constructor() {
    super("Invalid scheduled effective date");
    this.name = "InvalidScheduledDateError";
  }
}

export class ScheduledDateMustBeFutureError extends Error {
  readonly status = 400 as const;
  readonly code: ApiErrorCode = "SCHEDULED_DATE_MUST_BE_FUTURE";
  constructor() {
    super("Scheduled effective date must be in the future");
    this.name = "ScheduledDateMustBeFutureError";
  }
}

export class ScheduledDateBeforeCancellationError extends Error {
  readonly status = 400 as const;
  readonly code: ApiErrorCode = "SCHEDULED_DATE_BEFORE_CANCELLATION";
  constructor() {
    super("Scheduled effective date must be before the cancellation date");
    this.name = "ScheduledDateBeforeCancellationError";
  }
}

export class PhaseNotFoundError extends Error {
  readonly status = 404 as const;
  readonly code: ApiErrorCode = "PHASE_NOT_FOUND";
  constructor() {
    super("Price phase not found");
    this.name = "PhaseNotFoundError";
  }
}

export class PhaseAlreadyAppliedError extends Error {
  readonly status = 400 as const;
  readonly code: ApiErrorCode = "PHASE_ALREADY_APPLIED";
  constructor() {
    super("Price phase has already been applied");
    this.name = "PhaseAlreadyAppliedError";
  }
}

export class AlreadyPausedError extends Error {
  readonly status = 400 as const;
  readonly code: ApiErrorCode = "SUBSCRIPTION_ALREADY_PAUSED";
  constructor() {
    super("Subscription is already paused");
    this.name = "AlreadyPausedError";
  }
}

export class NotPausedError extends Error {
  readonly status = 400 as const;
  readonly code: ApiErrorCode = "SUBSCRIPTION_NOT_PAUSED";
  constructor() {
    super("Subscription is not paused");
    this.name = "NotPausedError";
  }
}
