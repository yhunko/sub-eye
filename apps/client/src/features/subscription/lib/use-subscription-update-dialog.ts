import { useModal } from "@ebay/nice-modal-react";
import { useCallback, useState } from "react";
import { useUpdateSubscription } from "@/entities/subscription";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";

export const useSubscriptionUpdateDialog = () => {
  const modal = useModal();
  const { dateFnsFormat } = useDateFormat();
  const { locale } = useDateFnsLocale();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { mutate: updateSubscription, isPending } = useUpdateSubscription();

  const closeModal = useCallback(async () => {
    await modal.hide();
    modal.remove();
  }, [modal]);

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
    setValidationError(null);
  }, []);

  return {
    modal,
    dateFnsFormat,
    locale,
    selectedDate,
    setSelectedDate,
    validationError,
    setValidationError,
    updateSubscription,
    isPending,
    closeModal,
    handleDateChange,
  };
};
