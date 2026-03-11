import { createContext } from "react";
import type { SubscriptionComparatorWizardContextValue } from "./subscription-comparator-wizard-context.types";

export const SubscriptionComparatorWizardContext =
  createContext<SubscriptionComparatorWizardContextValue | null>(null);
