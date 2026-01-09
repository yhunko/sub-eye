import { SubscriptionSchema } from "@/shared/lib/db/schema";

export interface SubscriptionBillingDetails {
  // Logic for the original currency (e.g., USD)
  original: {
    currencyCode: number;
    // The normalized monthly cost in original currency
    // UI Use: The gray text "$6.39/mo" next to the bold "$5.90"
    monthly: number;
  };

  // Logic for the user's preferred currency (e.g., UAH)
  preferred: {
    currencyCode: number;

    // The cost converted to preferred currency (Face value)
    // UI Use: "245 UAH" (If you toggle view to 'Preferred')
    amount: number;

    // The normalized monthly cost in preferred currency
    // UI Use: "265 UAH/mo" OR used for sorting/summing total expenses
    monthly: number;
    yearly: number;

    // The effective exchange rate used (1.0 if same currency)
    // UI Use: Tooltip "Converted at rate 41.5"
    exchangeRate: number;
  };
}

export interface SubscriptionDto extends SubscriptionSchema {
  billing: SubscriptionBillingDetails;

  /**
   * The next scheduled payment date for this subscription, based on
   * the original `paymentDate`, `every`, and `period` fields.
   *
   * ISO string in UTC, suitable for client-side parsing.
   */
  nextPaymentDate: string;
  lastPaymentDate: string | null;
}
