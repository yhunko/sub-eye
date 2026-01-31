import { GetSubscriptionsParams } from "@shared/domains/subscription";

export type UseSubscriptionsParams = {
  userId: string;
  queryParams?: GetSubscriptionsParams;
};
