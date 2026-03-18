import {
  createContext,
  useContext,
  useMemo,
  type FC,
  type PropsWithChildren,
} from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery } from "@/entities/category";
import { planUsageQuery } from "@/entities/billing";
import { subscriptionsQuery } from "@/entities/subscription";
import type { CategoryDto, PlanUsage, SubscriptionDto } from "shared";
import { normalizeCategoryName } from "./suggestions-state";

type SubscriptionMeta = {
  name: string;
  brandDomain: string | null;
  categoryId: string | null;
};

type CategoryMeta = {
  name: string;
  emoji: string;
};

type CategoryAiWorkbenchContextValue = {
  userId: string | null;
  usage: PlanUsage | undefined;
  categories: CategoryDto[];
  subscriptions: SubscriptionDto[];
  uncategorizedCount: number;
  subscriptionById: Map<string, SubscriptionMeta>;
  categoryById: Map<string, CategoryMeta>;
  existingCategoryNames: Set<string>;
  isAiQuotaReached: boolean;
};

const CategoryAiWorkbenchContext =
  createContext<CategoryAiWorkbenchContextValue | null>(null);

export const CategoryAiWorkbenchProvider: FC<PropsWithChildren> = ({
  children,
}) => {
  const { userId } = useAuth();
  const enabled = Boolean(userId);

  const { data: usage } = useQuery(
    planUsageQuery({
      params: { userId: userId ?? "" },
      options: { enabled },
    }),
  );

  const { data: categories = [] } = useQuery(
    categoriesQuery({
      params: { userId: userId ?? "" },
      options: { enabled },
    }),
  );

  const { data: subscriptions = [] } = useQuery(
    subscriptionsQuery({
      params: { userId: userId ?? "", queryParams: { status: "all" } },
      options: { enabled },
    }),
  );

  const subscriptionById = useMemo(
    () =>
      new Map(
        subscriptions.map((subscription) => [
          subscription.id,
          {
            name: subscription.name,
            brandDomain: subscription.brandDomain,
            categoryId: subscription.categoryId,
          },
        ]),
      ),
    [subscriptions],
  );

  const categoryById = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          category.id,
          {
            name: category.name,
            emoji: category.emoji,
          },
        ]),
      ),
    [categories],
  );

  const existingCategoryNames = useMemo(
    () =>
      new Set(
        categories.map((category) => normalizeCategoryName(category.name)),
      ),
    [categories],
  );

  const uncategorizedCount = useMemo(
    () =>
      subscriptions.filter((subscription) => subscription.categoryId === null)
        .length,
    [subscriptions],
  );

  const aiQuota = usage?.aiInsights;
  const isAiQuotaReached =
    aiQuota?.isLimited === true && (aiQuota.remaining ?? 0) <= 0;

  return (
    <CategoryAiWorkbenchContext.Provider
      value={{
        userId: userId ?? null,
        usage,
        categories,
        subscriptions,
        uncategorizedCount,
        subscriptionById,
        categoryById,
        existingCategoryNames,
        isAiQuotaReached,
      }}
    >
      {children}
    </CategoryAiWorkbenchContext.Provider>
  );
};

export const useCategoryAiWorkbench = (): CategoryAiWorkbenchContextValue => {
  const value = useContext(CategoryAiWorkbenchContext);

  if (!value) {
    throw new Error(
      "useCategoryAiWorkbench must be used within CategoryAiWorkbenchProvider",
    );
  }

  return value;
};
