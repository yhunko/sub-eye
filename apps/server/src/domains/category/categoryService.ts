import type {
  CategoryDto,
  CreateCategoryInput,
  DeleteCategoriesResponse,
  UpdateCategoryInput,
} from "@subeye/shared";
import { CategoryNotFoundError } from "./categoryErrors";
import { CategoryRepository } from "./categoryRepository";

type CategoryServiceDeps = {
  repository: typeof CategoryRepository;
};

const defaultDeps: CategoryServiceDeps = {
  repository: CategoryRepository,
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
    deps: CategoryServiceDeps = defaultDeps,
  ): Promise<CategoryDto> {
    const created = await deps.repository.create({
      userId,
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
