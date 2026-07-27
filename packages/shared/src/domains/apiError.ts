/**
 * Machine-readable error codes. The client branches on `code`; `message` is
 * for logs and for a last-resort toast, never for control flow.
 */
export const apiErrorCodes = [
  "SUBSCRIPTION_NOT_FOUND",
  "SUBSCRIPTION_ALREADY_PAUSED",
  "SUBSCRIPTION_NOT_PAUSED",
  "CATEGORY_NOT_FOUND",
  "CUSTOM_DATE_REQUIRED",
  "CANNOT_SCHEDULE_CANCELLED",
  "INVALID_SCHEDULED_DATE",
  "SCHEDULED_DATE_MUST_BE_FUTURE",
  "SCHEDULED_DATE_BEFORE_CANCELLATION",
  "PHASE_NOT_FOUND",
  "PHASE_ALREADY_APPLIED",
  "UNAUTHORIZED",
  "VALIDATION_FAILED",
  "INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];

export type ApiErrorBody = {
  success: false;
  error: { code: ApiErrorCode; message: string };
};
