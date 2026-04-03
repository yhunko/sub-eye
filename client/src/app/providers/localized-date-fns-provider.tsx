import { type Locale, setDefaultOptions } from "date-fns";
import { enUS } from "date-fns/locale";
import { type PropsWithChildren, useEffect, useState } from "react";
import { getLocale } from "@/i18n/runtime";
import { DateFnsLocaleContext } from "@/shared/lib/date-fns-context";

const localeMap: Record<string, () => Promise<Locale>> = {
  en: async () => (await import("date-fns/locale/en-US")).enUS,
  uk: async () => (await import("date-fns/locale/uk")).uk,
};

export function LocalizedDateFnsProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<Locale>(enUS);
  const currentLanguage = getLocale();

  useEffect(() => {
    const loadLocale = async () => {
      // Safely check if the locale exists or fallback to 'en'
      const loader = localeMap[currentLanguage] || localeMap.en;

      try {
        const loadedLocale = await loader();

        setDefaultOptions({ locale: loadedLocale });
        setLocale(loadedLocale);
      } catch (error) {
        console.error("Failed to load date-fns locale:", error);
      }
    };

    void loadLocale();
  }, [currentLanguage]);

  return (
    <DateFnsLocaleContext.Provider value={{ locale }}>
      {children}
    </DateFnsLocaleContext.Provider>
  );
}
