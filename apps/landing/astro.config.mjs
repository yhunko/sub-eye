// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

// Duplicated from src/lib/site.ts rather than imported: this file is loaded by
// Astro's own config loader before any path alias exists, and test/routes.test.ts
// asserts the two agree.
const SITE = "https://www.subeye.cc";

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
    }),
  ],
});
