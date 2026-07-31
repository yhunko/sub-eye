import { isLocale, type Locale } from "../lib/site";
import { type Copy, en } from "./en";
import { uk } from "./uk";

export type { Copy };

const dictionaries: Record<Locale, Copy> = { en, uk };

/**
 * `Astro.currentLocale` is `string | undefined`, so it is narrowed here rather
 * than at every call site.
 */
export const copyFor = (locale: string | undefined): Copy =>
  isLocale(locale) ? dictionaries[locale] : en;

export const localeOf = (locale: string | undefined): Locale =>
  isLocale(locale) ? locale : "en";
