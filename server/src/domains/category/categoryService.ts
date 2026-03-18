import { db } from "../../db";
import type {
  DeleteCategoriesResponse,
  CategoryDto,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "shared";
import { getPlanById } from "shared";
import { UserService } from "../user/userService";
import { CategoryRepository } from "./categoryRepository";
import {
  CategoryLimitReachedError,
  CategoryNotFoundError,
} from "./categoryErrors";

type CategoryServiceDeps = {
  repository: typeof CategoryRepository;
  userService: typeof UserService;
  runInTransaction?: <T>(run: (tx: unknown) => Promise<T>) => Promise<T>;
};

const defaultDeps: CategoryServiceDeps = {
  repository: CategoryRepository,
  userService: UserService,
  runInTransaction: async (run) => db.transaction((tx) => run(tx)),
};

const isUnsupportedTransactionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("transaction") &&
    (message.includes("not support") ||
      message.includes("unsupported") ||
      message.includes("neon-http"))
  );
};

export class CategoryService {
  static async getCategories(
    userId: string,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<CategoryDto[]> {
    const categories = await deps.repository.findByUserId(db, userId);
    return categories.map(this.toDto);
  }

  static async getCategoryById(
    id: string,
    userId: string,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<CategoryDto> {
    const category = await deps.repository.findById(db, id);

    if (!category || category.userId !== userId) {
      throw new CategoryNotFoundError();
    }

    return this.toDto(category);
  }

  static async createCategory(
    userId: string,
    payload: CreateCategoryInput,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<CategoryDto> {
    const [count, planId] = await Promise.all([
      deps.repository.countByUserId(db, userId),
      deps.userService.getPlanId(userId),
    ]);

    const maxCategories = getPlanById(planId).limits.maxCategories;

    if (maxCategories !== null && count >= maxCategories) {
      throw new CategoryLimitReachedError();
    }

    const created = await deps.repository.create(db, {
      userId,
      name: payload.name,
      emoji: payload.emoji,
    });

    return this.toDto(created);
  }

  static async updateCategory(
    id: string,
    userId: string,
    payload: UpdateCategoryInput,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<CategoryDto> {
    const existing = await deps.repository.findById(db, id);

    if (!existing || existing.userId !== userId) {
      throw new CategoryNotFoundError();
    }

    const updated = await deps.repository.update(db, id, payload);
    return this.toDto(updated);
  }

  static async deleteCategory(
    id: string,
    userId: string,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<void> {
    const existing = await deps.repository.findById(db, id);

    if (!existing || existing.userId !== userId) {
      throw new CategoryNotFoundError();
    }

    await deps.repository.delete(db, id);
  }

  static async deleteCategories(
    ids: string[],
    userId: string,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<DeleteCategoriesResponse> {
    const uniqueIds = Array.from(
      new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0)),
    );

    if (uniqueIds.length === 0) {
      throw new CategoryNotFoundError();
    }

    const executeDelete = async (database: typeof db) => {
      const existingCategories = await deps.repository.findByIdsForUser(
        database,
        userId,
        uniqueIds,
      );

      if (existingCategories.length !== uniqueIds.length) {
        throw new CategoryNotFoundError();
      }

      const deletedCount = await deps.repository.deleteByIdsForUser(
        database,
        userId,
        uniqueIds,
      );

      if (deletedCount !== uniqueIds.length) {
        throw new CategoryNotFoundError();
      }

      return { deletedCount };
    };

    const runInTransaction =
      deps.runInTransaction ?? defaultDeps.runInTransaction;

    if (!runInTransaction) {
      return executeDelete(db);
    }

    try {
      return await runInTransaction(async (tx) =>
        executeDelete(tx as unknown as typeof db),
      );
    } catch (error) {
      if (isUnsupportedTransactionError(error)) {
        return executeDelete(db);
      }

      throw error;
    }
  }

  static async deleteAllForUser(
    userId: string,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<void> {
    await deps.repository.deleteByUserId(db, userId);
  }

  private static toDto(category: {
    id: string;
    userId: string;
    name: string;
    emoji: string;
    createdAt: Date;
    updatedAt: Date;
  }): CategoryDto {
    return {
      id: category.id,
      userId: category.userId,
      name: category.name,
      emoji: category.emoji,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }
}
