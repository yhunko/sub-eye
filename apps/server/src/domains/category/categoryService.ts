import type {
  CategoryDto,
  CreateCategoryInput,
  DeleteCategoriesResponse,
  UpdateCategoryInput,
} from "@subeye/shared";
import { getPlanById } from "@subeye/shared";
import { UserService } from "../user/userService";
import {
  CategoryLimitReachedError,
  CategoryNotFoundError,
} from "./categoryErrors";
import { CategoryRepository } from "./categoryRepository";

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
    const categories = await deps.repository.findByUserId(userId);
    return categories.map(CategoryService.toDto);
  }

  static async getCategoryById(
    id: string,
    userId: string,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<CategoryDto> {
    const category = await deps.repository.findById(id);

    if (!category || category.userId !== userId) {
      throw new CategoryNotFoundError();
    }

    return CategoryService.toDto(category);
  }

  static async createCategory(
    userId: string,
    payload: CreateCategoryInput,
    orgId?: string | null,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<CategoryDto> {
    const effectiveOrgId = orgId ?? null;

    const [count, planId] = await Promise.all([
      effectiveOrgId
        ? deps.repository.countByOrgId(effectiveOrgId)
        : deps.repository.countByUserId(userId),
      deps.userService.getPlanId(userId),
    ]);

    const maxCategories = getPlanById(planId).limits.maxCategories;

    if (maxCategories !== null && count >= maxCategories) {
      throw new CategoryLimitReachedError();
    }

    const created = await deps.repository.create({
      userId,
      orgId: effectiveOrgId,
      name: payload.name,
      emoji: payload.emoji,
    });

    return CategoryService.toDto(created);
  }

  static async updateCategory(
    id: string,
    userId: string,
    payload: UpdateCategoryInput,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<CategoryDto> {
    const existing = await deps.repository.findById(id);

    if (!existing || existing.userId !== userId) {
      throw new CategoryNotFoundError();
    }

    const updated = await deps.repository.update(id, payload);
    return CategoryService.toDto(updated);
  }

  static async deleteCategory(
    id: string,
    userId: string,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<void> {
    const existing = await deps.repository.findById(id);

    if (!existing || existing.userId !== userId) {
      throw new CategoryNotFoundError();
    }

    await deps.repository.delete(id);
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

    // neon-http has no interactive transactions, so validate-then-delete runs
    // sequentially. The delete itself is a single `IN (...)` statement.
    const existingCategories = await deps.repository.findByIdsForUser(
      userId,
      uniqueIds,
    );

    if (existingCategories.length !== uniqueIds.length) {
      throw new CategoryNotFoundError();
    }

    const deletedCount = await deps.repository.deleteByIdsForUser(
      userId,
      uniqueIds,
    );

    if (deletedCount !== uniqueIds.length) {
      throw new CategoryNotFoundError();
    }

    return { deletedCount };
  }

  static async deleteAllForUser(
    userId: string,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<void> {
    await deps.repository.deleteByUserId(userId);
  }

  static async getOrgCategories(
    orgId: string,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<CategoryDto[]> {
    const categories = await deps.repository.findByOrgId(orgId);
    return categories.map(CategoryService.toDto);
  }

  static async deleteAllForOrg(
    orgId: string,
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<void> {
    await deps.repository.deleteByOrgId(orgId);
  }

  private static toDto(category: {
    id: string;
    userId: string;
    orgId: string | null;
    name: string;
    emoji: string;
    createdAt: Date;
    updatedAt: Date;
  }): CategoryDto {
    return {
      id: category.id,
      userId: category.userId,
      orgId: category.orgId,
      name: category.name,
      emoji: category.emoji,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }
}
