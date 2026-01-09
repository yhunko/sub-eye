import { getRequestConfig } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";
import { getLocaleAction } from "@/entities/locale/api/actions";

const namespaces = [
  "analytics",
  "auth",
  "common",
  "components",
  "errors",
  "navigation",
  "settings",
  "subscription",
  "subscription-overview",
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

export default getRequestConfig(async () => {
  const { sessionClaims } = await auth();
  const cookiesLocale = await getLocaleAction();

  const locale = sessionClaims?.publicMetadata?.locale ?? cookiesLocale ?? "en";

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
