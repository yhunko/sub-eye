import { getLocales } from "expo-localization";
import { resolveDeviceLocale } from "./locale";
import { getLocale, setLocale } from "./paraglide/runtime";

const deviceLocales = getLocales();

// Bootstrap: one synchronous pass before anything renders. Safe regardless of
// module-init order because no module ever calls m.*() at module scope.
setLocale(resolveDeviceLocale(deviceLocales.map((l) => l.languageCode)), {
  reload: false,
});

/**
 * The tag every `Intl` date format in the app is built from.
 *
 * The device's full tag rather than the bare app locale, because day-first vs
 * month-first is a REGIONAL convention iOS resolves from Region independently
 * of app language — but only while that tag still speaks the app's language, or
 * an English UI on a French phone prints French months. The tags are read once:
 * Android 13+ can swap the app language with the JS context alive, and falling
 * through to the bare app locale there still names the months correctly.
 */
export function dateLocale(): string {
  const locale = getLocale();
  return (
    deviceLocales.find((l) => l.languageTag.startsWith(locale))?.languageTag ??
    locale
  );
}

export type { AppLocale } from "./locale";
export { resolveDeviceLocale } from "./locale";
export * as m from "./paraglide/messages";
export { getLocale } from "./paraglide/runtime";
export { useAppLocale } from "./use-app-locale";
