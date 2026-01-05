import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

const namespaces = [
  "common",
  "navigation",
  "subscription",
  "settings",
  "analytics",
  "auth",
  "errors",
] as const;

async function loadMessages(locale: string) {
  const messages: Record<string, unknown> = {};

  await Promise.all(
    namespaces.map(async (namespace) => {
      try {
        const { default: module } = await import(
          `../model/messages/${locale}/${namespace}.json`
        );
        messages[namespace] = module;
      } catch (error) {
        console.error(`Failed to load: ${namespace} for ${locale}`, error);
        messages[namespace] = {};
      }
    }),
  );

  return messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
