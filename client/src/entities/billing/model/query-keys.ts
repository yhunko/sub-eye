import { createQueryKeys } from "@lukemorales/query-key-factory";

export const billingQueryKeys = createQueryKeys("billing", {
  usage: (filters: { userId: string }) => [filters.userId],
});
