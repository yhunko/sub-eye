import { useEffect } from "react";
import { PlanFeatureLockCard } from "@/entities/billing";
import * as m from "@/i18n/messages";
import { track } from "@/shared/lib/analytics";

type CategoryLimitAlertProps = {
  current: number;
  limit: number;
};

export const CategoryLimitAlert = ({
  current,
  limit,
}: CategoryLimitAlertProps) => {
  useEffect(() => {
    track("upgrade_prompt_viewed", {
      source: "category_limit",
      feature: "unlimited_categories",
    });
  }, []);

  return (
    <PlanFeatureLockCard
      title={m.categories_limit_reached_title()}
      description={m.categories_limit_reached_description({ current, limit })}
    />
  );
};
