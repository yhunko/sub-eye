import type { PropsWithChildren } from "react";
import { SubscriptionComparatorWizardContext } from "./subscription-comparator-wizard-context";
import type { SubscriptionComparatorWizardContextValue } from "./subscription-comparator-wizard-context.types";

export const SubscriptionComparatorWizardProvider = ({
  children,
  value,
}: PropsWithChildren<{
  value: SubscriptionComparatorWizardContextValue;
}>) => (
  <SubscriptionComparatorWizardContext.Provider value={value}>
    {children}
  </SubscriptionComparatorWizardContext.Provider>
);
