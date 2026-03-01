import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { useEffect, useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
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
  Input,
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
import { CurrencyText } from "@/entities/currency";
import { useScheduleSubscriptionPriceChange } from "@/entities/subscription";
import { toast } from "sonner";
import * as m from "@/i18n/messages";

type PriceChangeMode = "nextOccurrence" | "customDate";

type PriceChangeDialogState = {
  mode: PriceChangeMode;
  scheduledCostInput: string;
  customDate: Date | undefined;
  isReviewStep: boolean;
  error: string | null;
};

const getPriceChangeValidationError = ({
  parsedCost,
  mode,
  customDate,
}: {
  parsedCost: number;
  mode: PriceChangeMode;
  customDate: Date | undefined;
}): string | null => {
  if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
    return m.validation_positive_number();
  }

  if (mode === "customDate" && !customDate) {
    return m.validation_required();
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

const toNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

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
        customDate: undefined,
        isReviewStep: false,
        error: null,
      });

      const { mutate: schedulePriceChange, isPending } =
        useScheduleSubscriptionPriceChange();

      const nextOccurrenceDate = useMemo(
        () => new Date(nextPaymentDate),
        [nextPaymentDate],
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
          customDate: existingEffectiveAt ?? nextOccurrenceDate,
          isReviewStep: false,
          error: null,
        });
      }, [
        modal.visible,
        scheduledPriceChange,
        currentCost,
        nextOccurrenceDate,
      ]);

      const closeModal = async () => {
        await modal.hide();
        modal.remove();
      };

      const parsedCost = useMemo(
        () => toNumber(state.scheduledCostInput),
        [state.scheduledCostInput],
      );

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
        });

        if (validationError) {
          setState((prev) => ({ ...prev, error: validationError }));
          return;
        }

        const payload: SchedulePriceChangeInput = {
          mode: state.mode,
          scheduledCost: parsedCost,
          customDate:
            state.mode === "customDate"
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

      return (
        <Dialog
          open={modal.visible}
          onOpenChange={(open) => {
            if (!open) {
              void closeModal();
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
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
                    <Input
                      type="number"
                      step="0.01"
                      value={state.scheduledCostInput}
                      onChange={(event) => {
                        setState((prev) => ({
                          ...prev,
                          scheduledCostInput: event.target.value,
                          error: null,
                        }));
                      }}
                      placeholder="0.00"
                    />
                    <p className="text-muted-foreground text-xs">
                      {m.subscription_priceChange_newPrice_currencyHint({
                        currency: currentCurrency.toUpperCase(),
                      })}
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
                        className="flex-1"
                        aria-label={m.subscription_priceChange_mode_nextOccurrence()}
                      >
                        {m.subscription_priceChange_mode_nextOccurrence()}
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="customDate"
                        className="flex-1"
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
                      currencyCode={currentCurrency}
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

            <DialogFooter>
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
