import type {
  CategoryDto,
  CreateCategoryInput,
  DeleteCategoriesResponse,
  UpdateCategoryInput,
} from "@subeye/model";
import type { CategoryRecord, Ports } from "@subeye/store";
import {
  createCategory,
  deleteCategories,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@subeye/store";
import { createPorts } from "../ports";
import { CategoryRepository } from "./categoryRepository";

export class CategoryService {
  static async getCategories(
    userId: string,
    ports: Ports = createPorts(userId),
  ): Promise<CategoryDto[]> {
    return (await listCategories(ports)).map((category) =>
      CategoryService.toDto(category, userId),
    );
  }

  static async createCategory(
    userId: string,
    payload: CreateCategoryInput,
    ports: Ports = createPorts(userId),
  ): Promise<CategoryDto> {
    return CategoryService.toDto(await createCategory(ports, payload), userId);
  }

  static async updateCategory(
    id: string,
    userId: string,
    payload: UpdateCategoryInput,
    ports: Ports = createPorts(userId),
  ): Promise<CategoryDto> {
    return CategoryService.toDto(
      await updateCategory(ports, id, payload),
      userId,
    );
  }

  static async deleteCategory(
    id: string,
    userId: string,
    ports: Ports = createPorts(userId),
  ): Promise<void> {
    return deleteCategory(ports, id);
  }

  static async deleteCategories(
    ids: string[],
    userId: string,
    ports: Ports = createPorts(userId),
  ): Promise<DeleteCategoriesResponse> {
    return deleteCategories(ports, ids);
  }

  /** Account deletion, from the Clerk `user.deleted` webhook. */
  static async deleteAllForUser(userId: string): Promise<void> {
    await CategoryRepository.deleteByUserId(userId);
  }

  /**
   * The tenant is not on the record — the store is single-tenant — so the DTO
   * gets it back from the request. Nothing in the client reads it; it is on the
   * wire contract and stays until the contract changes.
   */
  private static toDto(category: CategoryRecord, userId: string): CategoryDto {
    return {
      id: category.id,
      userId,
      name: category.name,
      emoji: category.emoji,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
