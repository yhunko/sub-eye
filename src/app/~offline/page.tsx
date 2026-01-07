import { getTranslations } from "next-intl/server";

export default async function OfflinePage() {
  const t = await getTranslations("common.offline");

  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
    </div>
  );
}
