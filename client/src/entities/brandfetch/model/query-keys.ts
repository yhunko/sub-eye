import { createQueryKeys } from "@lukemorales/query-key-factory";
import { BrandfetchSearchParams } from "./params";

export const brandfetchQueryKeys = createQueryKeys("brandfetch", {
  search: (params: BrandfetchSearchParams) => [params],
});
