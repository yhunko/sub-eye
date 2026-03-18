import { useMemo } from "react";
import { format } from "date-fns";
import { useDateFormat } from "@/shared/hooks/use-date-format";

export const useLastGeneratedLabel = (
  lastGeneratedAt: string | null,
): string | null => {
  const { dateFnsFormat } = useDateFormat();

  return useMemo(() => {
    if (!lastGeneratedAt) {
      return null;
    }

    const parsed = new Date(lastGeneratedAt);

    if (Number.isNaN(parsed.getTime())) {
      return lastGeneratedAt;
    }

    const formattedDate = format(parsed, dateFnsFormat);
    const formattedTime = parsed.toLocaleTimeString();

    return `${formattedDate}, ${formattedTime}`;
  }, [lastGeneratedAt, dateFnsFormat]);
};
