import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, isBefore, isSameDay, startOfDay } from "date-fns";
import type { SchedulePriceChangeInput, SubscriptionDto } from "shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldSet,
  Label,
  Spinner,
  ToggleGroup,
  ToggleGroupItem,
  Separator,
  Alert,
  AlertDescription,
} from "@/shared/components";
import { SubscriptionDatePicker } from "../../add-subscription/ui/subscription-date-picker/subscription-date-picker";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import {
  CurrencyInput,
  CurrencySelect,
  CurrencyText,
} from "@/entities/currency";
import {
  useCancelScheduledSubscriptionPriceChange,
  useScheduleSubscriptionPriceChange,
} from "@/entities/subscription";
import { toast } from "sonner";
import * as m from "@/i18n/messages";
import { parsePriceInput, sanitizePriceInput } from "@/shared/lib/price-input";

type PriceChangeMode = "nextOccurrence" | "customDate";

type PriceChangeDialogState = {
  mode: PriceChangeMode;
  scheduledCostInput: string;
  scheduledCurrency: string;
  customDate: Date | undefined;
  isReviewStep: boolean;
  error: string | null;
};

const getPriceChangeValidationError = ({
  parsedCost,
  mode,
  customDate,
  scheduledCurrency,
}: {
  parsedCost: number;
  mode: PriceChangeMode;
  customDate: Date | undefined;
  scheduledCurrency: string;
}): string | null => {
  if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
    return m.validation_positive_number();
  }

  if (!scheduledCurrency.trim()) {
    return m.validation_required();
  }

  if (mode === "customDate" && !customDate) {
    return m.validation_required();
  }

  if (
    mode === "customDate" &&
    customDate &&
    isBefore(startOfDay(customDate), addDays(startOfDay(new Date()), 1))
  ) {
    return m.validation_future_date();
  }

  return null;
};

interface SubscriptionSchedulePriceChangeDialogProps {
  subscriptionId: string;
  subscriptionName: string;
  currentCost: number;
  currentCurrency: string;
  nextPaymentDate: string;
  scheduledPriceChange: SubscriptionDto["scheduledPriceChange"];
}

export const SubscriptionSchedulePriceChangeDialog =
  NiceModal.create<SubscriptionSchedulePriceChangeDialogProps>(
    ({
      subscriptionId,
      subscriptionName,
      currentCost,
      currentCurrency,
      nextPaymentDate,
      scheduledPriceChange,
    }) => {
      const modal = useModal();
      const { dateFnsFormat } = useDateFormat();
      const { locale } = useDateFnsLocale();

      const [state, setState] = useState<PriceChangeDialogState>({
        mode: "nextOccurrence",
        scheduledCostInput: "",
        scheduledCurrency: currentCurrency,
        customDate: undefined,
        isReviewStep: false,
        error: null,
      });

      const { mutate: schedulePriceChange, isPending: isSchedulePending } =
        useScheduleSubscriptionPriceChange();
      const { mutate: cancelScheduledPriceChange, isPending: isCancelPending } =
        useCancelScheduledSubscriptionPriceChange();
      const isPending = isSchedulePending || isCancelPending;

      const nextOccurrenceDate = useMemo(
        () => new Date(nextPaymentDate),
        [nextPaymentDate],
      );
      const minCustomDate = useMemo(
        () => addDays(startOfDay(new Date()), 1),
        [],
      );

      useEffect(() => {
        if (!modal.visible) {
          return;
        }

        const existingEffectiveAt = scheduledPriceChange?.effectiveAt
          ? new Date(scheduledPriceChange.effectiveAt)
          : undefined;

        const defaultMode: PriceChangeMode =
          existingEffectiveAt &&
          isSameDay(existingEffectiveAt, nextOccurrenceDate)
            ? "nextOccurrence"
            : scheduledPriceChange
              ? "customDate"
              : "nextOccurrence";

        setState({
          mode: defaultMode,
          scheduledCostInput: String(
            scheduledPriceChange?.cost ?? currentCost.toFixed(2),
          ),
          scheduledCurrency: scheduledPriceChange?.currency ?? currentCurrency,
          customDate: existingEffectiveAt ?? nextOccurrenceDate,
          isReviewStep: false,
          error: null,
        });
      }, [
        modal.visible,
        scheduledPriceChange,
        currentCost,
        currentCurrency,
        nextOccurrenceDate,
      ]);

      const closeModal = async () => {
        await modal.hide();
        modal.remove();
      };

      const parsedCost = useMemo(() => {
        const parsed = parsePriceInput(state.scheduledCostInput);
        return parsed ?? Number.NaN;
      }, [state.scheduledCostInput]);

      const effectiveDate =
        state.mode === "nextOccurrence" ? nextOccurrenceDate : state.customDate;

      const effectiveDateLabel = effectiveDate
        ? format(effectiveDate, dateFnsFormat, { locale })
        : "—";

      const continueToReview = () => {
        const validationError = getPriceChangeValidationError({
          parsedCost,
          mode: state.mode,
          customDate: state.customDate,
          scheduledCurrency: state.scheduledCurrency,
        });

        if (validationError) {
          setState((prev) => ({ ...prev, error: validationError }));
          return;
        }

        setState((prev) => ({
          ...prev,
          error: null,
          isReviewStep: true,
        }));
      };

      const handleConfirm = () => {
        const validationError = getPriceChangeValidationError({
          parsedCost,
          mode: state.mode,
          customDate: state.customDate,
          scheduledCurrency: state.scheduledCurrency,
        });

        if (validationError) {
          setState((prev) => ({ ...prev, error: validationError }));
          return;
        }

        const shouldUseNextOccurrenceMode =
          state.mode === "customDate" &&
          state.customDate &&
          isSameDay(state.customDate, nextOccurrenceDate);

        const payload: SchedulePriceChangeInput = {
          mode: shouldUseNextOccurrenceMode ? "nextOccurrence" : state.mode,
          scheduledCost: parsedCost,
          scheduledCurrency: state.scheduledCurrency,
          customDate: shouldUseNextOccurrenceMode
            ? null
            : state.mode === "customDate"
              ? state.customDate!.toISOString()
              : null,
        };

        schedulePriceChange(
          {
            id: subscriptionId,
            payload,
          },
          {
            onSuccess: async () => {
              toast.success(m.messages_updated());
              await closeModal();
            },
            onError: () => {
              toast.error(m.messages_error());
            },
          },
        );
      };

      const handleCancelScheduled = () => {
        if (!scheduledPriceChange) {
          return;
        }

        cancelScheduledPriceChange(
          { id: subscriptionId },
          {
            onSuccess: async () => {
              toast.success(m.messages_updated());
              await closeModal();
            },
            onError: () => {
              toast.error(m.messages_error());
            },
          },
        );
      };

      return (
        <Dialog
          open={modal.visible}
          onOpenChange={(open) => {
            if (!open) {
              void closeModal();
            }
          }}
        >
          <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-[36rem] overflow-x-hidden overflow-y-auto p-4 sm:w-full sm:max-w-lg sm:p-6">
            <DialogHeader>
              <DialogTitle className="pr-8 leading-tight break-words">
                {scheduledPriceChange
                  ? m.subscription_priceChange_dialog_title_edit({
                      name: subscriptionName,
                    })
                  : m.subscription_priceChange_dialog_title_create({
                      name: subscriptionName,
                    })}
              </DialogTitle>
              <DialogDescription>
                {state.isReviewStep
                  ? m.subscription_priceChange_dialog_reviewDescription()
                  : m.subscription_priceChange_dialog_setupDescription()}
              </DialogDescription>
            </DialogHeader>

            {!state.isReviewStep ? (
              <div className="space-y-4">
                <FieldSet className="gap-3 rounded-2xl border p-4">
                  <div className="space-y-2">
                    <Label className="text-xs tracking-wide uppercase">
                      {m.subscription_priceChange_newPrice_label()}
                    </Label>
                    <CurrencyInput
                      CurrencySelect={
                        <CurrencySelect
                          value={state.scheduledCurrency}
                          disabled={isPending}
                          onChange={(value) => {
                            setState((prev) => ({
                              ...prev,
                              scheduledCurrency: value,
                              error: null,
                            }));
                          }}
                        />
                      }
                      sanitizeValue={sanitizePriceInput}
                      InputProps={{
                        value: state.scheduledCostInput,
                        onChange: (event) => {
                          setState((prev) => ({
                            ...prev,
                            scheduledCostInput: sanitizePriceInput(
                              event.target.value,
                            ),
                            error: null,
                          }));
                        },
                        placeholder: "0.00",
                        disabled: isPending,
                      }}
                    />
                    <p className="text-muted-foreground text-xs">
                      {m.subscription_priceChange_newPrice_currencyHint()}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-xs tracking-wide uppercase">
                      {m.subscription_priceChange_effectiveDate_label()}
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={state.mode}
                      onValueChange={(value) => {
                        if (
                          value === "nextOccurrence" ||
                          value === "customDate"
                        ) {
                          setState((prev) => ({
                            ...prev,
                            mode: value,
                            error: null,
                          }));
                        }
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <ToggleGroupItem
                        value="nextOccurrence"
                        className="min-w-0 flex-1 text-xs sm:text-sm"
                        aria-label={m.subscription_priceChange_mode_nextOccurrence()}
                      >
                        {m.subscription_priceChange_mode_nextOccurrence()}
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="customDate"
                        className="min-w-0 flex-1 text-xs sm:text-sm"
                        aria-label={m.subscription_priceChange_mode_customDate()}
                      >
                        {m.subscription_priceChange_mode_customDate()}
                      </ToggleGroupItem>
                    </ToggleGroup>

                    {state.mode === "nextOccurrence" ? (
                      <p className="text-muted-foreground text-xs">
                        {m.subscription_priceChange_mode_nextOccurrence_hint({
                          date: format(nextOccurrenceDate, dateFnsFormat, {
                            locale,
                          }),
                        })}
                      </p>
                    ) : (
                      <SubscriptionDatePicker
                        value={state.customDate}
                        minDate={minCustomDate}
                        onChange={(value) => {
                          setState((prev) => ({
                            ...prev,
                            customDate: value,
                            error: null,
                          }));
                        }}
                      />
                    )}
                  </div>
                </FieldSet>

                {state.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{state.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <FieldSet className="gap-3 rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {m.subscription_priceChange_review_currentPrice()}
                    </span>
                    <CurrencyText
                      currencyCode={currentCurrency}
                      amount={currentCost}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {m.subscription_priceChange_review_newPrice()}
                    </span>
                    <CurrencyText
                      currencyCode={state.scheduledCurrency}
                      amount={parsedCost}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {m.subscription_priceChange_review_effectiveAt()}
                    </span>
                    <span className="font-medium">{effectiveDateLabel}</span>
                  </div>
                </FieldSet>

                <p className="text-muted-foreground text-xs">
                  {m.subscription_priceChange_dialog_reviewHint()}
                </p>
              </div>
            )}

            <DialogFooter className="mt-2 gap-2 [&>button]:w-full sm:[&>button]:w-auto">
              {scheduledPriceChange && (
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={handleCancelScheduled}
                >
                  {m.subscription_priceChange_pendingCard_cancel()}
                </Button>
              )}
              <Button
                variant="outline"
                disabled={isPending}
                onClick={closeModal}
              >
                {m.common_actions_cancel()}
              </Button>

              {state.isReviewStep ? (
                <>
                  <Button
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      setState((prev) => ({ ...prev, isReviewStep: false }))
                    }
                  >
                    {m.common_actions_back()}
                  </Button>
                  <Button onClick={handleConfirm} disabled={isPending}>
                    {isPending && <Spinner />}
                    {m.subscription_priceChange_dialog_confirm()}
                  </Button>
                </>
              ) : (
                <Button onClick={continueToReview} disabled={isPending}>
                  {m.common_actions_continue()}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    },
  );
