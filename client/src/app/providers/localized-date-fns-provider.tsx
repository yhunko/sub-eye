import { useEffect, useState, PropsWithChildren } from "react";
import { setDefaultOptions, type Locale } from "date-fns";
import { enUS } from "date-fns/locale";
import { getLocale } from "@/i18n/runtime";
import { DateFnsLocaleContext } from "@/shared/lib/date-fns-context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localeMap: Record<string, () => Promise<any>> = {
  en: () => import("date-fns/locale/en-US"),
  uk: () => import("date-fns/locale/uk"),
};

export function LocalizedDateFnsProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<Locale>(enUS);
  const currentLanguage = getLocale();

  useEffect(() => {
    const loadLocale = async () => {
      // Safely check if the locale exists or fallback to 'en'
      const loader = localeMap[currentLanguage] || localeMap.en;

      try {
        const { default: loadedLocale } = await loader();

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
