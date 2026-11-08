// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { bobby } from "./src/lib/bobby.ts";
import { priceRises } from "./src/lib/priceRises.ts";

// Duplicated from src/lib/site.ts rather than imported: this file is loaded by
// Astro's own config loader before any path alias exists, and test/routes.test.ts
// asserts the two agree.
const SITE = "https://subeye.yhunko.dev";

export default defineConfig({
  site: SITE,
  output: "static",
  // The shipped app requests `/en/privacy-policy/` with the slash. This must
  // stay in step with `assets.html_handling` in wrangler.jsonc, or the app's
  // links become redirects at best and 404s at worst.
  trailingSlash: "always",
  build: {
    format: "directory",
    // `auto` left the marketing page behind two render-blocking stylesheets.
    // The whole site is ~20 KB of CSS and a visit is one or two page views, so
    // inlining beats caching a file the visitor will not request twice.
    inlineStylesheets: "always",
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en", "uk"],
    routing: {
      // This flag is the whole URL contract: it is what produces `/en/…`
      // instead of serving English from the bare root.
      prefixDefaultLocale: true,
      // `/` is redirected by public/_redirects with a real 308, rather than
      // the meta-refresh page a static Astro build would emit here.
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: "en", locales: { en: "en", uk: "uk" } },
      // Each page's head names an x-default alternate; the sitemap says the
      // same. Only the two content pages get a `lastmod`, from the day their
      // facts were read: a build date on every URL is a lastmod Google learns
      // to ignore.
      serialize(item) {
        const english = item.url.replace(
          /^(https:\/\/[^/]+)\/(en|uk)\//,
          "$1/en/",
        );
        item.links = [
          ...(item.links ?? []),
          { url: english, lang: "x-default" },
        ];
        if (item.url.endsWith("/bobby-alternative/")) item.lastmod = bobby.read;
        if (item.url.endsWith("/price-increases-2026/")) {
          item.lastmod = priceRises
            .map((rise) => rise.read)
            .sort()
            .at(-1);
        }
        return item;
      },
    }),
  ],
});
