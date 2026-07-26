import { getLocales } from "expo-localization";
import { resolveDeviceLocale } from "./locale";
import { setLocale } from "./paraglide/runtime";

// Bootstrap: one synchronous pass before anything renders. Safe regardless of
// module-init order because no module ever calls m.*() at module scope.
setLocale(resolveDeviceLocale(getLocales().map((l) => l.languageCode)), {
  reload: false,
});

export type { AppLocale } from "./locale";
export { resolveDeviceLocale } from "./locale";
export * as m from "./paraglide/messages";
export { getLocale } from "./paraglide/runtime";
export { useAppLocale } from "./use-app-locale";
