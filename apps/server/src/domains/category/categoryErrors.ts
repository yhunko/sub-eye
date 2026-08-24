import type { ApiErrorCode } from "@subeye/model";

export class CategoryNotFoundError extends Error {
  readonly status = 404 as const;
  readonly code: ApiErrorCode = "CATEGORY_NOT_FOUND";
  constructor() {
    super("Category not found");
    this.name = "CategoryNotFoundError";
  }
}
