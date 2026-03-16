import { db } from "../../db";
import type {
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
};

const defaultDeps: CategoryServiceDeps = {
  repository: CategoryRepository,
  userService: UserService,
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
