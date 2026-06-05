import { useUser } from "@clerk/clerk-react";
import { DateTimezoneUtils } from "@subeye/shared";
import { type FC, useMemo } from "react";
import { SubscriptionBillingUtils } from "@/entities/subscription";
import { cn } from "@/shared/lib/classes-utils";

type SubscriptionNextBillProps = {
  /**
   * Next payment date already calculated on the backend.
   * ISO string.
   */
  nextBillDate: string;
  format?: "long" | "short";
};

export const SubscriptionNextBill: FC<SubscriptionNextBillProps> = ({
  nextBillDate,
  format = "long",
}) => {
  const { user, isLoaded } = useUser();

  const displayState = useMemo(() => {
    if (!isLoaded) return null;

    const timezone = user?.publicMetadata?.preferredTimezone;
    const zonedDate = DateTimezoneUtils.toZoned(nextBillDate, timezone);

    return SubscriptionBillingUtils.toDisplayState(zonedDate, timezone);
  }, [isLoaded, user?.publicMetadata?.preferredTimezone, nextBillDate]);

  if (!displayState) return null;

  const { formattedDate, relativeText, colorClass } = displayState;

  return (
    <div className="flex flex-row md:flex-col">
      {format === "long" && (
        <span className="font-medium text-gray-800 dark:text-gray-200">
          {formattedDate}
          <span className="inline md:hidden">&nbsp;</span>
        </span>
      )}
      <span className={cn("text-sm", colorClass)}>{relativeText}</span>
    </div>
  );
};
