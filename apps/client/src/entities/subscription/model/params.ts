import type { GetSubscriptionsParams } from "@subeye/shared";

export type UseSubscriptionsParams = {
  userId: string;
  orgId?: string | null;
  queryParams?: GetSubscriptionsParams;
};
