import { boolean, object, optional, string } from "valibot";

export const subscriptionOverviewSearchSchema = object({
  from: optional(string()),
  monthlyTrendOpen: optional(boolean()),
  monthlyTrendMonth: optional(string()),
});

export type SubscriptionOverviewSearch = {
  from?: string;
  monthlyTrendOpen?: boolean;
  monthlyTrendMonth?: string;
};
