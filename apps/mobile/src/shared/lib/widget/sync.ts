import { ExtensionStorage } from "@bacons/apple-targets";
import { buildWidgetSnapshot, type WidgetSnapshotInput } from "./snapshot";

/**
 * The App Group both the app and the widget extension are members of. It is
 * declared in three places that must agree exactly — `ios.entitlements` in
 * app.json, `targets/widget/expo-target.config.js`, and here. A mismatch is
 * silent: `UserDefaults(suiteName:)` returns a usable-looking store that simply
 * never sees the other side's writes.
 */
export const WIDGET_APP_GROUP = "group.cc.subeye.app";

/** The single key the Swift side decodes. */
export const WIDGET_SNAPSHOT_KEY = "snapshot";

// No platform guard: without the native module — Android, and any test that
// reaches this file — every `ExtensionStorage` method is already a no-op.
const storage = new ExtensionStorage(WIDGET_APP_GROUP);

let lastWritten: string | null = null;

/**
 * Writes the snapshot and asks WidgetKit to redraw — but only when something
 * actually changed.
 *
 * The dedupe is load-bearing, not an optimisation. `syncWidget` runs on every
 * foreground, and WidgetKit gives an app a bounded number of timeline reloads
 * per day; spending them on identical redraws is how a widget ends up stale
 * exactly when a payment lands. Comparing the serialised snapshot also catches
 * the common case where the dashboard refetched and returned the same numbers.
 */
export function syncWidget(input: WidgetSnapshotInput): void {
  const json = JSON.stringify(buildWidgetSnapshot(input));
  if (json === lastWritten) return;
  lastWritten = json;

  storage.set(WIDGET_SNAPSHOT_KEY, json);
  ExtensionStorage.reloadWidget();
}

/**
 * Drops the snapshot, leaving the extension in its no-data state.
 *
 * The App Group store is not the app's own storage — it outlives sign-out and
 * app termination, so without this the ex-account's brand names and amounts stay
 * on a Home Screen anyone holding the device can read.
 *
 * Resetting `lastWritten` is what makes it safe to sign back in: the same
 * account with unchanged numbers would otherwise be deduped away and the widget
 * would sit empty until a figure moved.
 */
export function clearWidget(): void {
  lastWritten = null;
  storage.remove(WIDGET_SNAPSHOT_KEY);
  ExtensionStorage.reloadWidget();
}
