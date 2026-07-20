import type { ApiErrorCode } from "@subeye/shared";

export class CategoryNotFoundError extends Error {
  readonly status = 404 as const;
  readonly code: ApiErrorCode = "CATEGORY_NOT_FOUND";
  constructor() {
    super("Category not found");
    this.name = "CategoryNotFoundError";
  }
}

export class CategoryLimitReachedError extends Error {
  readonly status = 403 as const;
  readonly code: ApiErrorCode = "CATEGORY_LIMIT_REACHED";
  constructor() {
    super("Category limit reached");
    this.name = "CategoryLimitReachedError";
  }
}
