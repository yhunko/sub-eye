import { GetSubscriptionsParams } from "shared";

export type UseSubscriptionsParams = {
  userId: string;
  orgId?: string | null;
  queryParams?: GetSubscriptionsParams;
};
