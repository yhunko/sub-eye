import type { StatusFilter } from "shared";
import * as m from "@/i18n/messages";

type StatusFilterOption = {
  label: () => string;
  value: StatusFilter;
};

export const statusFilterOptions: StatusFilterOption[] = [
  { label: m.subscription_filter_status_active, value: "active" },
  { label: m.subscription_status_cancelled, value: "cancelled" },
  { label: m.subscription_filter_status_all, value: "all" },
];
