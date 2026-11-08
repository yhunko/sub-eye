import { copyFor } from "../i18n";
import type { Locale, SitePage } from "./site";

/**
 * Each page's share card: the content pages have their own, every other page
 * reuses the home card. The alt text is the card's own words, so it describes
 * the picture rather than the page.
 */
export const ogCard = (locale: Locale, page?: SitePage) => {
  const c = copyFor(locale);
  const own =
    page === "bobby-alternative"
      ? c.og.bobby
      : page === "price-increases-2026"
        ? c.og.rises
        : null;
  const card = own ?? c.og.home;
  return {
    path: own ? `/og/${locale}-${page}.png` : `/og/${locale}.png`,
    alt: `${card.title} ${card.sub}`,
  };
};
