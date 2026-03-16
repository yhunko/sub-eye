export class CategoryNotFoundError extends Error {
  readonly status = 404 as const;
  constructor() {
    super("Category not found");
    this.name = "CategoryNotFoundError";
  }
}

export class CategoryLimitReachedError extends Error {
  readonly status = 403 as const;
  constructor() {
    super("Category limit reached");
    this.name = "CategoryLimitReachedError";
  }
}
