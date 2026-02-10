import { createContext, useContext } from "react";
import { type Locale } from "date-fns";
import { enUS } from "date-fns/locale";

interface DateFnsLocaleContextValue {
  locale: Locale;
}

export const DateFnsLocaleContext = createContext<DateFnsLocaleContextValue>({
  locale: enUS,
});

export const useDateFnsLocale = () => useContext(DateFnsLocaleContext);
