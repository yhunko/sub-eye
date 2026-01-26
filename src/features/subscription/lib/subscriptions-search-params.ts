import { createSearchParamsCache } from "nuqs/server";
import { subscriptionsQueryParsers } from "./subscriptions-query";

export const subscriptionsSearchParamsCache = createSearchParamsCache(
  subscriptionsQueryParsers,
);
