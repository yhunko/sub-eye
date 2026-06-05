import { describe, expect, it, mock } from "bun:test";
import { CategoryNotFoundError } from "../src/domains/category/categoryErrors";
import { CategoryService } from "../src/domains/category/categoryService";

describe("CategoryService.deleteCategories", () => {
  it("deletes all requested user-owned categories and deduplicates ids", async () => {
    const findByIdsForUser = mock(async (userId: string, ids: string[]) =>
      ids.map((id) => ({
        id,
        userId,
      })),
    );
    const deleteByIdsForUser = mock(
      async (_userId: string, ids: string[]) => ids.length,
    );

    const result = await CategoryService.deleteCategories(
      ["cat_1", "cat_2", "cat_1"],
      "user_1",
      {
        repository: {
          findByIdsForUser,
          deleteByIdsForUser,
        } as never,
        userService: {} as never,
      },
    );

    expect(result).toEqual({ deletedCount: 2 });
    expect(findByIdsForUser).toHaveBeenCalledTimes(1);
    expect(findByIdsForUser.mock.calls[0]?.[1]).toEqual(["cat_1", "cat_2"]);
    expect(deleteByIdsForUser).toHaveBeenCalledTimes(1);
    expect(deleteByIdsForUser.mock.calls[0]?.[1]).toEqual(["cat_1", "cat_2"]);
  });

  it("throws when any category id is missing or not owned by user", async () => {
    const deleteByIdsForUser = mock(async () => 0);

    await expect(
      CategoryService.deleteCategories(["cat_1", "cat_2"], "user_1", {
        repository: {
          findByIdsForUser: async () => [{ id: "cat_1", userId: "user_1" }],
          deleteByIdsForUser,
        } as never,
        userService: {} as never,
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);

    expect(deleteByIdsForUser).toHaveBeenCalledTimes(0);
  });

  it("throws when delete result count differs from validated ids", async () => {
    await expect(
      CategoryService.deleteCategories(["cat_1", "cat_2"], "user_1", {
        repository: {
          findByIdsForUser: async (userId: string, ids: string[]) =>
            ids.map((id) => ({ id, userId })),
          deleteByIdsForUser: async () => 1,
        } as never,
        userService: {} as never,
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
  });
});
