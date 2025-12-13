import { FC, useMemo } from "react";
import { cn, DateTimezoneUtils } from "@/shared/lib";
import { SubscriptionUIMapper } from "../lib/subscription-ui.mapper";
import { useUserPublicMetadata } from "@/entities/user";

type SubscriptionNextBillProps = {
  /**
   * Next payment date already calculated on the backend.
   * ISO string.
   */
  nextBillDate: string;
};

export const SubscriptionNextBill: FC<SubscriptionNextBillProps> = ({
  nextBillDate,
}) => {
  const { data: publicMetadata, isLoading } = useUserPublicMetadata();

  const displayState = useMemo(() => {
    if (isLoading) return null;

    const timezone = publicMetadata?.preferredTimezone;
    const zonedDate = DateTimezoneUtils.toZoned(nextBillDate, timezone);

    return SubscriptionUIMapper.toDisplayState(zonedDate, timezone);
  }, [isLoading, publicMetadata?.preferredTimezone, nextBillDate]);

  if (isLoading || !displayState) return null;

  const { formattedDate, relativeText, colorClass } = displayState;

  return (
    <div className="flex flex-col">
      <span className="font-medium text-gray-800 dark:text-gray-200">
        {formattedDate}
      </span>
      <span className={cn("text-sm", colorClass)}>{relativeText}</span>
    </div>
  );
};
