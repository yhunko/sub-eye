import { useEffect } from "react";
import { setDefaultOptions } from "date-fns";
import { getLocale } from "@/i18n/runtime";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localeMap: Record<string, () => Promise<any>> = {
  en: () => import("date-fns/locale/en-US"),
  uk: () => import("date-fns/locale/uk"),
};

export function LocalizedDateFnsProvider() {
  useEffect(() => {
    const loadLocale = async () => {
      // Safely check if the locale exists or fallback to 'en'
      const loader = localeMap[getLocale()] || localeMap.en;

      try {
        const { default: loadedLocale } = await loader();

        setDefaultOptions({ locale: loadedLocale });
      } catch (error) {
        console.error("Failed to load date-fns locale:", error);
      }
    };

    void loadLocale();
  }, []);

  return null;
}
