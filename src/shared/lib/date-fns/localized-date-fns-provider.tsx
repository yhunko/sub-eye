"use client";

import { useEffect } from "react";
import { setDefaultOptions } from "date-fns";

// We define the type of the import functions to ensure they return a Locale
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localeMap: Record<string, () => Promise<any>> = {
  en: () => import("date-fns/locale/en-US"),
  ua: () => import("date-fns/locale/uk"),
};

interface LocalizedDateFnsProviderProps {
  locale: string;
}

export function LocalizedDateFnsProvider({
  locale,
}: LocalizedDateFnsProviderProps) {
  useEffect(() => {
    const loadLocale = async () => {
      // Safely check if the locale exists or fallback to 'en'
      const loader = localeMap[locale] || localeMap.en;

      try {
        const { default: loadedLocale } = await loader();

        setDefaultOptions({ locale: loadedLocale });
      } catch (error) {
        console.error("Failed to load date-fns locale:", error);
      }
    };

    void loadLocale();
  }, [locale]);

  return null;
}
