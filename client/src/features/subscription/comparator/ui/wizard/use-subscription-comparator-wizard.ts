import { useContext } from "react";
import { SubscriptionComparatorWizardContext } from "./subscription-comparator-wizard-context";

export const useSubscriptionComparatorWizard = () => {
  const context = useContext(SubscriptionComparatorWizardContext);

  if (!context) {
    throw new Error(
      "useSubscriptionComparatorWizard must be used within SubscriptionComparatorWizardProvider",
    );
  }

  return context;
};
