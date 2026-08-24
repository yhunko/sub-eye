import { CATEGORY_EMOJIS } from "@subeye/model";

/**
 * The emoji a newly-created category gets, derived from its name.
 *
 * ponytail: no emoji picker. Choosing one is a third modal inside a form sheet
 * that is already inside a form sheet, for a decision nobody has an opinion
 * about at the moment they are typing "Streaming". Hashing the name gives every
 * category a distinct, stable mark for free — "Streaming" always lands on the
 * same one, so it never looks random on re-create. Swap this for a real picker
 * when the category management screen exists; the server accepts any emoji from
 * CATEGORY_EMOJIS either way.
 */
export function pickCategoryEmoji(name: string): string {
  const normalized = name.trim().toLowerCase();

  // FNV-1a. Any stable hash would do; this one is four lines and has no
  // clustering on short ASCII strings, which is all the input ever is.
  let hash = 0x811c9dc5;
  for (let index = 0; index < normalized.length; index++) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  const bucket = Math.abs(hash) % CATEGORY_EMOJIS.length;
  // The set is non-empty at module load, but the index signature does not know
  // that and a bad emoji is a 422 the user cannot act on.
  return CATEGORY_EMOJIS[bucket] ?? "📦";
}
