import { boolean, object, optional, string } from "valibot";

export const dashboardSearchSchema = object({
  monthlyTrendOpen: optional(boolean()),
  monthlyTrendMonth: optional(string()),
});

export type DashboardSearch = {
  monthlyTrendOpen?: boolean;
  monthlyTrendMonth?: string;
};
