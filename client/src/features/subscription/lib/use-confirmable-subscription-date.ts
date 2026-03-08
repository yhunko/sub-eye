import { useCallback, useMemo } from "react";
import { format, type Locale } from "date-fns";

type UseConfirmableSubscriptionDateParams = {
  selectedDate: Date | undefined;
  dateFnsFormat: string;
  locale?: Locale;
  requiredMessage: string;
  setValidationError: (message: string | null) => void;
  onConfirm: (dateIso: string) => void;
};

export const useConfirmableSubscriptionDate = ({
  selectedDate,
  dateFnsFormat,
  locale,
  requiredMessage,
  setValidationError,
  onConfirm,
}: UseConfirmableSubscriptionDateParams) => {
  const formattedDate = useMemo(() => {
    if (!selectedDate) {
      return "";
    }

    return format(selectedDate, dateFnsFormat, { locale });
  }, [selectedDate, dateFnsFormat, locale]);

  const handleConfirm = useCallback(() => {
    if (!selectedDate) {
      setValidationError(requiredMessage);
      return;
    }

    setValidationError(null);
    onConfirm(selectedDate.toISOString());
  }, [selectedDate, setValidationError, requiredMessage, onConfirm]);

  return {
    formattedDate,
    handleConfirm,
  };
};
