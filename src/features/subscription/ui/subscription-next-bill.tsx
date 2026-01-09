import { FC, useMemo } from "react";
import { cn, DateTimezoneUtils } from "@/shared/lib";
import { SubscriptionUIMapper } from "../lib/subscription-ui.mapper";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

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
  const { user, isLoaded } = useUser();
  const t = useTranslations("subscription.date");

  const displayState = useMemo(() => {
    if (!isLoaded) return null;

    const timezone = user?.publicMetadata?.preferredTimezone;
    const zonedDate = DateTimezoneUtils.toZoned(nextBillDate, timezone);

    return SubscriptionUIMapper.toDisplayState(zonedDate, timezone, t);
  }, [isLoaded, user?.publicMetadata?.preferredTimezone, nextBillDate, t]);

  if (!displayState) return null;

  const { formattedDate, relativeText, colorClass } = displayState;

  return (
    <div className="flex flex-row md:flex-col">
      <span className="font-medium text-gray-800 dark:text-gray-200">
        {formattedDate}
        <span className="inline md:hidden">&nbsp;</span>
      </span>
      <span className={cn("text-sm", colorClass)}>{relativeText}</span>
    </div>
  );
};
