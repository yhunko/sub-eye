import { FC, useMemo } from "react";
import { Period } from "@/shared/lib/db";
import { cn } from "@/shared/lib";
import { SubscriptionDateService } from "../lib/subscription-date.service";
import { SubscriptionUIMapper } from "../lib/subscription-ui.mapper";
import { useUserPublicMetadata } from "@/entities/user";

type SubscriptionNextBillProps = {
  every: number;
  period: Period;
  nextBillDate: string;
};

export const SubscriptionNextBill: FC<SubscriptionNextBillProps> = ({
  every,
  period,
  nextBillDate,
}) => {
  const { data: publicMetadata, isLoading } = useUserPublicMetadata();

  const displayState = useMemo(() => {
    if (isLoading) return null;

    const timezone = publicMetadata?.preferredTimezone;

    const actualNextDate = SubscriptionDateService.getNextBillDate(
      nextBillDate,
      every,
      period,
      timezone,
    );

    return SubscriptionUIMapper.toDisplayState(actualNextDate, timezone);
  }, [
    isLoading,
    publicMetadata?.preferredTimezone,
    nextBillDate,
    every,
    period,
  ]);

  if (isLoading || !displayState) return null;

  const { formattedDate, relativeText, colorClass } = displayState;

  return (
    <div className="flex flex-col">
      <span className="font-medium text-gray-900">{formattedDate}</span>
      <span className={cn("text-sm", colorClass)}>{relativeText}</span>
    </div>
  );
};
