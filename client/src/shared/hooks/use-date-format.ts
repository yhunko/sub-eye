import { useUser } from "@clerk/clerk-react";
import {
  DateFormatUtils,
  type DateFormatConfig,
} from "@shared/utils/dateFormatUtils";

/**
 * Hook to get the user's preferred date format with graceful fallback
 * Fallback chain: user preference -> browser locale -> default (DD/MM/YYYY)
 */
export const useDateFormat = (): DateFormatConfig => {
  const { user } = useUser();
  const preferredFormat = user?.publicMetadata?.preferredDateFormat;

  return DateFormatUtils.getPreferredFormat(preferredFormat);
};
