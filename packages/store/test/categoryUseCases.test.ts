import { describe, expect, it } from "bun:test";
import type { CategoryRecord } from "../src";
import {
  CategoryNotFoundError,
  createCategory,
  deleteCategories,
  deleteCategory,
  updateCategory,
} from "../src";
import { NOW, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

const category = (id: string): CategoryRecord => ({
  id,
  name: id,
  emoji: "📺",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const portsFor = (ids: string[]) =>
  inMemoryPorts({ now: NOW, categories: ids.map(category) });

describe("createCategory", () => {
  it("writes the row", async () => {
    const ports = inMemoryPorts({ now: NOW });

    const created = await createCategory(ports, {
      name: "Streaming",
      emoji: "📺",
    });

    expect(ports.dump().categories).toEqual([
      {
        id: created.id,
        name: "Streaming",
        emoji: "📺",
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      },
    ]);
  });
});

describe("updateCategory", () => {
  it("patches only the fields given", async () => {
    const ports = portsFor(["cat_1"]);

    await updateCategory(ports, "cat_1", { name: "Renamed" });

    expect(ports.dump().categories[0]?.name).toBe("Renamed");
    expect(ports.dump().categories[0]?.emoji).toBe("📺");
  });

  it("throws for a category that does not exist", async () => {
    await expect(
      updateCategory(portsFor([]), "cat_1", { name: "Renamed" }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
  });
});

describe("deleteCategory", () => {
  it("leaves the subscriptions that referenced it, uncategorized", async () => {
    const ports = inMemoryPorts({
      now: NOW,
      categories: [category("cat_1")],
      subscriptions: [subscriptionRecord({ categoryId: "cat_1" })],
    });

    await deleteCategory(ports, "cat_1");

    // `ON DELETE SET NULL`. Deleting a category is not a way to delete
    // subscriptions, and the confirmation copy in the app says so.
    expect(ports.dump().categories).toEqual([]);
    expect(ports.dump().subscriptions[0]?.categoryId).toBeNull();
  });

  it("throws for a category that does not exist", async () => {
    await expect(deleteCategory(portsFor([]), "cat_1")).rejects.toBeInstanceOf(
      CategoryNotFoundError,
    );
  });
});

describe("deleteCategories", () => {
  it("deletes every requested category and deduplicates ids", async () => {
    const ports = portsFor(["cat_1", "cat_2", "cat_3"]);

    const result = await deleteCategories(ports, ["cat_1", "cat_2", "cat_1"]);

    expect(result).toEqual({ deletedCount: 2 });
    expect(ports.dump().categories.map((c) => c.id)).toEqual(["cat_3"]);
  });

  it("deletes nothing when any id is missing", async () => {
    const ports = portsFor(["cat_1"]);

    await expect(
      deleteCategories(ports, ["cat_1", "cat_2"]),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);

    // All-or-nothing: a client that sent a stale list is told so rather than
    // losing the half of it that still existed.
    expect(ports.dump().categories).toHaveLength(1);
  });

  it("rejects an empty request", async () => {
    await expect(deleteCategories(portsFor([]), ["  "])).rejects.toBeInstanceOf(
      CategoryNotFoundError,
    );
  });
});
