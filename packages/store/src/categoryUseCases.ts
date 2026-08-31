import { CategoryNotFoundError } from "./errors";
import type { Ports } from "./ports";
import type { CategoryRecord } from "./records";

export const listCategories = (ports: Ports): Promise<CategoryRecord[]> =>
  ports.categories.all();

export const createCategory = (
  ports: Ports,
  input: { name: string; emoji: string },
): Promise<CategoryRecord> => {
  const now = ports.now().toISOString();

  return ports.categories.create({
    id: ports.newId(),
    name: input.name,
    emoji: input.emoji,
    createdAt: now,
    updatedAt: now,
  });
};

export const updateCategory = async (
  ports: Ports,
  id: string,
  input: { name?: string; emoji?: string },
): Promise<CategoryRecord> => {
  if (!(await ports.categories.byId(id))) throw new CategoryNotFoundError();

  return ports.categories.update(id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
  });
};

/**
 * Deleting a category never deletes a subscription — the subscriptions that
 * referenced it are left uncategorized. The delete-confirmation copy in the app
 * counts exactly those rows.
 */
export const deleteCategory = async (
  ports: Ports,
  id: string,
): Promise<void> => {
  if (!(await ports.categories.byId(id))) throw new CategoryNotFoundError();

  await ports.categories.remove(id);
};

/**
 * All-or-nothing: one unknown id fails the whole request rather than deleting
 * the rest, so a client that sent a stale list is told so instead of silently
 * losing part of it.
 */
export const deleteCategories = async (
  ports: Ports,
  ids: string[],
): Promise<{ deletedCount: number }> => {
  const uniqueIds = Array.from(
    new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0)),
  );
  if (uniqueIds.length === 0) throw new CategoryNotFoundError();

  const known = new Set((await ports.categories.all()).map((c) => c.id));
  if (uniqueIds.some((id) => !known.has(id))) {
    throw new CategoryNotFoundError();
  }

  for (const id of uniqueIds) {
    await ports.categories.remove(id);
  }

  return { deletedCount: uniqueIds.length };
};
