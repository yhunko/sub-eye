import { useLocales } from "expo-localization";
import type { AppLocale } from "./locale";
import { resolveDeviceLocale } from "./locale";
import { getLocale, setLocale } from "./paraglide/runtime";

// iOS relaunches the app on a per-app language change, but Android 13+ can
// recreate the activity with the JS context still alive — so re-resolve here and
// let the caller re-key its navigator. The setLocale-during-render is
// deliberate: it is a synchronous global write that must land before children
// render their messages.
export function useAppLocale(): AppLocale {
  const locales = useLocales();
  const next = resolveDeviceLocale(locales.map((l) => l.languageCode));
  if (next !== getLocale()) void setLocale(next, { reload: false });
  return next;
}
