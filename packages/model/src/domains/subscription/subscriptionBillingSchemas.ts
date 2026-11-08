export type SubscriptionBillingDetails = {
  original: {
    currencyCode: string;
    monthly: number;
  };
  preferred: {
    currencyCode: string;
    amount: number;
    monthly: number;
    yearly: number;
    exchangeRate: number;
  };
};
