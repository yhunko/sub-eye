import { copyFor } from "../i18n";
import { subeyeListing } from "./bobby";
import { ogCard } from "./og";
import {
  appStoreUrl,
  type ContentPage,
  canonical,
  contentPublished,
  freePrice,
  type Locale,
  proPrice,
  proPriceUkraine,
  SITE,
} from "./site";

const org = {
  "@type": "Organization",
  "@id": `${SITE}/#org`,
  name: "SubEye",
  url: `${SITE}/`,
  logo: `${SITE}/apple-touch-icon.png`,
};

/**
 * The download is free and Pro is an in-app purchase, so the app carries two
 * offers. One offer at the Pro price would say the app costs that much. No
 * rating or review: the page shows neither, so the markup may not claim one.
 */
export const homeSchema = (locale: Locale, description: string) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "MobileApplication",
      "@id": `${SITE}/#app`,
      name: "SubEye",
      applicationCategory: "FinanceApplication",
      operatingSystem: `iOS ${subeyeListing.minimumIOS} or later`,
      url: canonical(locale),
      installUrl: appStoreUrl,
      inLanguage: locale,
      description,
      offers: [
        { "@type": "Offer", price: String(freePrice), priceCurrency: "USD" },
        {
          "@type": "Offer",
          name: "SubEye Pro",
          price: (locale === "uk" ? proPriceUkraine : proPrice.usd).toFixed(2),
          priceCurrency: "USD",
          description: "One-time in-app purchase",
        },
      ],
      publisher: { "@id": org["@id"] },
    },
    org,
  ],
});

export const articleSchema = (
  locale: Locale,
  page: ContentPage,
  headline: string,
  modified: string,
) => {
  const url = canonical(locale, page);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline,
        inLanguage: locale,
        datePublished: contentPublished,
        dateModified: modified,
        author: { "@id": org["@id"] },
        publisher: { "@id": org["@id"] },
        mainEntityOfPage: url,
        image: `${SITE}${ogCard(locale, page).path}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "SubEye",
            item: canonical(locale),
          },
          { "@type": "ListItem", position: 2, name: headline, item: url },
        ],
      },
      org,
    ],
  };
};

export const pageHeadline = (locale: Locale, page: ContentPage) =>
  page === "bobby-alternative"
    ? copyFor(locale).bobby.title
    : copyFor(locale).rises.title;
