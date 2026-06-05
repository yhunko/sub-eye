import {
  FREE_COMPARATOR_AI_MONTHLY_LIMIT,
  FREE_COMPARATOR_MONTHLY_LIMIT,
  FREE_SUBSCRIPTION_HISTORY_LIMIT,
  getPlanById,
  getPlanFeaturesMap,
  PLUS_COMPARATOR_AI_MONTHLY_LIMIT,
  type PlanId,
  type PlanUsage,
} from "@subeye/shared";
import { isLocalPlanSwitcherEnabled } from "../env/local-dev-runtime";

export const LOCAL_PLAN_OVERRIDE_STORAGE_KEY = "subeye.local.planOverride";
export const LOCAL_PLAN_SWITCHER_UI_STATE_STORAGE_KEY =
  "subeye.local.planSwitcherUiState";

export type LocalPlanOverride = PlanId | null;
export type LocalPlanSwitcherUiState = "open" | "minimized" | "hidden";

type PlanOverrideSubscriber = () => void;
type PlanSwitcherUiStateSubscriber = () => void;

type SubscriptionHistoryResponseLike<TItem> = {
  history: TItem[];
  hasMore: boolean;
};

const planOverrideSubscribers = new Set<PlanOverrideSubscriber>();
const planSwitcherUiStateSubscribers = new Set<PlanSwitcherUiStateSubscriber>();

const normalizeLocalPlanOverride = (value: unknown): LocalPlanOverride => {
  if (value === "free" || value === "plus") {
    return value;
  }

  return null;
};

const normalizeLocalPlanSwitcherUiState = (
  value: unknown,
): LocalPlanSwitcherUiState => {
  if (value === "open" || value === "minimized" || value === "hidden") {
    return value;
  }

  return "open";
};

const notifyPlanOverrideSubscribers = () => {
  planOverrideSubscribers.forEach((listener) => {
    listener();
  });
};

const notifyPlanSwitcherUiStateSubscribers = () => {
  planSwitcherUiStateSubscribers.forEach((listener) => {
    listener();
  });
};

const handleStorageEvent = (event: StorageEvent) => {
  if (event.key === LOCAL_PLAN_OVERRIDE_STORAGE_KEY) {
    notifyPlanOverrideSubscribers();
    return;
  }

  if (event.key === LOCAL_PLAN_SWITCHER_UI_STATE_STORAGE_KEY) {
    notifyPlanSwitcherUiStateSubscribers();
    return;
  }
};

const updateStorageListener = () => {
  if (typeof window === "undefined") {
    return;
  }

  const hasSubscribers =
    planOverrideSubscribers.size > 0 || planSwitcherUiStateSubscribers.size > 0;

  if (hasSubscribers) {
    window.addEventListener("storage", handleStorageEvent);
    return;
  }

  window.removeEventListener("storage", handleStorageEvent);
};

export const readLocalPlanOverride = (): LocalPlanOverride => {
  if (!isLocalPlanSwitcherEnabled()) {
    return null;
  }

  try {
    const value = window.localStorage.getItem(LOCAL_PLAN_OVERRIDE_STORAGE_KEY);
    return normalizeLocalPlanOverride(value);
  } catch {
    return null;
  }
};

export const writeLocalPlanOverride = (value: LocalPlanOverride): void => {
  if (!isLocalPlanSwitcherEnabled()) {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(LOCAL_PLAN_OVERRIDE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(LOCAL_PLAN_OVERRIDE_STORAGE_KEY, value);
    }
  } finally {
    notifyPlanOverrideSubscribers();
  }
};

export const subscribeLocalPlanOverride = (
  listener: PlanOverrideSubscriber,
): (() => void) => {
  if (!isLocalPlanSwitcherEnabled()) {
    return () => {};
  }

  planOverrideSubscribers.add(listener);
  updateStorageListener();

  return () => {
    planOverrideSubscribers.delete(listener);
    updateStorageListener();
  };
};

export const readLocalPlanSwitcherUiState = (): LocalPlanSwitcherUiState => {
  if (!isLocalPlanSwitcherEnabled()) {
    return "open";
  }

  try {
    const value = window.localStorage.getItem(
      LOCAL_PLAN_SWITCHER_UI_STATE_STORAGE_KEY,
    );
    return normalizeLocalPlanSwitcherUiState(value);
  } catch {
    return "open";
  }
};

export const writeLocalPlanSwitcherUiState = (
  value: LocalPlanSwitcherUiState,
): void => {
  if (!isLocalPlanSwitcherEnabled()) {
    return;
  }

  try {
    window.localStorage.setItem(
      LOCAL_PLAN_SWITCHER_UI_STATE_STORAGE_KEY,
      value,
    );
  } finally {
    notifyPlanSwitcherUiStateSubscribers();
  }
};

export const subscribeLocalPlanSwitcherUiState = (
  listener: PlanSwitcherUiStateSubscriber,
): (() => void) => {
  if (!isLocalPlanSwitcherEnabled()) {
    return () => {};
  }

  planSwitcherUiStateSubscribers.add(listener);
  updateStorageListener();

  return () => {
    planSwitcherUiStateSubscribers.delete(listener);
    updateStorageListener();
  };
};

export const applyPlanUsageOverride = (
  usage: PlanUsage,
  override: LocalPlanOverride,
): PlanUsage => {
  if (!override || usage.planId === override) {
    return usage;
  }

  const plan = getPlanById(override);
  const comparisonLimit =
    override === "plus" ? null : FREE_COMPARATOR_MONTHLY_LIMIT;
  const aiLimit =
    override === "plus"
      ? PLUS_COMPARATOR_AI_MONTHLY_LIMIT
      : FREE_COMPARATOR_AI_MONTHLY_LIMIT;

  return {
    ...usage,
    planId: override,
    features: getPlanFeaturesMap(override),
    subscriptions: {
      ...usage.subscriptions,
      limit: plan.limits.maxSubscriptions,
    },
    categories: {
      ...usage.categories,
      limit: plan.limits.maxCategories,
    },
    comparatorComparisons: {
      ...usage.comparatorComparisons,
      limit: comparisonLimit,
      remaining:
        comparisonLimit === null
          ? null
          : Math.max(comparisonLimit - usage.comparatorComparisons.current, 0),
      isLimited: comparisonLimit !== null,
    },
    aiInsights: {
      ...usage.aiInsights,
      limit: aiLimit,
      remaining: Math.max(aiLimit - usage.aiInsights.current, 0),
      isLimited: true,
    },
  };
};

export const applySubscriptionHistoryOverride = <TItem>(
  response: SubscriptionHistoryResponseLike<TItem>,
  override: LocalPlanOverride,
): SubscriptionHistoryResponseLike<TItem> => {
  if (override === null) {
    return response;
  }

  if (override === "plus") {
    if (!response.hasMore) {
      return response;
    }

    return {
      ...response,
      hasMore: false,
    };
  }

  const history = response.history.slice(0, FREE_SUBSCRIPTION_HISTORY_LIMIT);
  const hasMore =
    response.hasMore ||
    response.history.length > FREE_SUBSCRIPTION_HISTORY_LIMIT;

  if (
    history.length === response.history.length &&
    hasMore === response.hasMore
  ) {
    return response;
  }

  return {
    history,
    hasMore,
  };
};
