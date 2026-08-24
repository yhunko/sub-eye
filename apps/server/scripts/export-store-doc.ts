// Print one user's rows as the StoreDoc that apps/mobile keeps in MMKV.
// Usage: bun --env-file=apps/server/.env apps/server/scripts/export-store-doc.ts user_2… > /tmp/subeye-restore.json
//
// The inversion this needs — drop every `userId`, and normalise the two
// timestamp modes `db/schema.ts` mixes — is already exactly what `createPorts`
// does on every request, and its output type IS the record shape the document
// holds. A second hand-written mapping would be a second place for
// `cancelled_at`, the one Date-mode column, to be read the wrong way round.
import { createPorts } from "../src/domains/ports";

const userId = process.argv[2]?.trim();

if (!userId) {
  console.error("usage: export-store-doc.ts <clerk user id>");
  process.exit(1);
}

const ports = createPorts(userId);

const [preferences, categories, subscriptions, phases] = await Promise.all([
  ports.preferences.read(),
  ports.categories.all(),
  ports.subscriptions.all(),
  ports.phases.all(),
]);

// A user id that matches nothing reads as an empty list and default
// preferences, not as an error — so say so, on stderr, rather than printing a
// well-formed document of nothing.
if (subscriptions.length === 0) {
  console.error(`warning: ${userId} has no subscriptions`);
}

console.log(
  JSON.stringify(
    { v: 1, preferences, categories, subscriptions, phases },
    null,
    2,
  ),
);
