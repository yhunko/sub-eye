import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CurrencyInput,
  CurrencySelect,
  CurrencyText,
} from "@/entities/currency";
import { useAddIntroDiscount, useStartTrial } from "@/entities/subscription";
import * as m from "@/i18n/messages";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldSet,
  Label,
  Separator,
  Spinner,
} from "@/shared/components";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import { parsePriceInput, sanitizePriceInput } from "@/shared/lib/price-input";
import { SubscriptionDatePicker } from "../../add-subscription/ui/subscription-date-picker/subscription-date-picker";

export type SubscriptionPricingPhaseMode = "trial" | "intro";

export interface SubscriptionPricingPhaseDialogProps {
  mode: SubscriptionPricingPhaseMode;
  subscriptionId: string;
  subscriptionName: string;
  currentCost: number;
  currentCurrency: string;
}

type DialogState = {
  overridePriceInput: string;
  standardPriceInput: string;
  currency: string;
  endDate: Date | undefined;
  error: string | null;
};

export const SubscriptionPricingPhaseDialog =
  NiceModal.create<SubscriptionPricingPhaseDialogProps>(
    ({ mode, subscriptionId, currentCost, currentCurrency }) => {
      const modal = useModal();
      const { dateFnsFormat } = useDateFormat();
      const { locale } = useDateFnsLocale();

      const { mutate: startTrial, isPending: isTrialPending } = useStartTrial();
      const { mutate: addIntroDiscount, isPending: isIntroPending } =
        useAddIntroDiscount();
      const isPending = isTrialPending || isIntroPending;

      const minEndDate = useMemo(() => addDays(startOfDay(new Date()), 1), []);

      const [state, setState] = useState<DialogState>({
        overridePriceInput: mode === "trial" ? "0" : "",
        standardPriceInput: currentCost.toFixed(2),
        currency: currentCurrency,
        endDate: undefined,
        error: null,
      });

      useEffect(() => {
        if (!modal.visible) return;
        setState({
          overridePriceInput: mode === "trial" ? "0" : "",
          standardPriceInput: currentCost.toFixed(2),
          currency: currentCurrency,
          endDate: addDays(startOfDay(new Date()), 30),
          error: null,
        });
      }, [modal.visible, mode, currentCost, currentCurrency]);

      const overridePrice = useMemo(
        () => parsePriceInput(state.overridePriceInput) ?? Number.NaN,
        [state.overridePriceInput],
      );
      const standardPrice = useMemo(
        () => parsePriceInput(state.standardPriceInput) ?? Number.NaN,
        [state.standardPriceInput],
      );

      const closeModal = async () => {
        await modal.hide();
        modal.remove();
      };

      const validate = (): string | null => {
        const overrideValid =
          mode === "trial"
            ? Number.isFinite(overridePrice) && overridePrice >= 0
            : Number.isFinite(overridePrice) && overridePrice > 0;
        if (!overrideValid) return m.validation_positive_number();
        if (!Number.isFinite(standardPrice) || standardPrice <= 0) {
          return m.validation_positive_number();
        }
        if (!state.currency.trim()) return m.validation_required();
        if (!state.endDate) return m.validation_required();
        if (isBefore(startOfDay(state.endDate), minEndDate)) {
          return m.validation_future_date();
        }
        return null;
      };

      const handleConfirm = () => {
        const error = validate();
        if (error || !state.endDate) {
          setState((prev) => ({ ...prev, error }));
          return;
        }

        const endsAt = state.endDate.toISOString();
        const onSettled = {
          onSuccess: async () => {
            toast.success(m.messages_updated());
            await closeModal();
          },
          onError: () => toast.error(m.messages_error()),
        };

        if (mode === "trial") {
          startTrial(
            {
              id: subscriptionId,
              payload: {
                trialCost: overridePrice,
                trialCurrency: state.currency,
                endsAt,
                standardCost: standardPrice,
                standardCurrency: state.currency,
              },
            },
            onSettled,
          );
        } else {
          addIntroDiscount(
            {
              id: subscriptionId,
              payload: {
                introCost: overridePrice,
                introCurrency: state.currency,
                endsAt,
                standardCost: standardPrice,
                standardCurrency: state.currency,
              },
            },
            onSettled,
          );
        }
      };

      const endDateLabel = state.endDate
        ? format(state.endDate, dateFnsFormat, { locale })
        : "—";

      const overrideLabel =
        mode === "trial"
          ? m.subscription_trial_trialPrice_label()
          : m.subscription_introDiscount_introPrice_label();
      const endDateFieldLabel =
        mode === "trial"
          ? m.subscription_trial_endDate_label()
          : m.subscription_introDiscount_endDate_label();
      const standardLabel =
        mode === "trial"
          ? m.subscription_trial_standardPrice_label()
          : m.subscription_introDiscount_standardPrice_label();

      const isFreeTrial = mode === "trial" && overridePrice === 0;

      return (
        <Dialog
          open={modal.visible}
          onOpenChange={(open) => {
            if (!open) void closeModal();
          }}
        >
          <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-[36rem] overflow-y-auto p-4 sm:w-full sm:max-w-lg sm:p-6">
            <DialogHeader>
              <DialogTitle className="pr-8 leading-tight">
                {mode === "trial"
                  ? m.subscription_trial_title()
                  : m.subscription_introDiscount_title()}
              </DialogTitle>
              <DialogDescription>
                {mode === "trial"
                  ? m.subscription_trial_description()
                  : m.subscription_introDiscount_description()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <FieldSet className="gap-3 rounded-2xl border p-4">
                <div className="space-y-2">
                  <Label className="text-xs tracking-wide uppercase">
                    {overrideLabel}
                  </Label>
                  <CurrencyInput
                    CurrencySelect={
                      <CurrencySelect
                        value={state.currency}
                        disabled={isPending}
                        onChange={(value) =>
                          setState((prev) => ({
                            ...prev,
                            currency: value,
                            error: null,
                          }))
                        }
                      />
                    }
                    sanitizeValue={sanitizePriceInput}
                    InputProps={{
                      value: state.overridePriceInput,
                      onChange: (event) =>
                        setState((prev) => ({
                          ...prev,
                          overridePriceInput: sanitizePriceInput(
                            event.target.value,
                          ),
                          error: null,
                        })),
                      placeholder: "0.00",
                      disabled: isPending,
                    }}
                  />
                  {mode === "trial" && (
                    <p className="text-muted-foreground text-xs">
                      {m.subscription_trial_free_hint()}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs tracking-wide uppercase">
                    {endDateFieldLabel}
                  </Label>
                  <SubscriptionDatePicker
                    value={state.endDate}
                    minDate={minEndDate}
                    onChange={(value) =>
                      setState((prev) => ({
                        ...prev,
                        endDate: value,
                        error: null,
                      }))
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs tracking-wide uppercase">
                    {standardLabel}
                  </Label>
                  <CurrencyInput
                    CurrencySelect={
                      <CurrencySelect
                        value={state.currency}
                        disabled
                        onChange={() => {}}
                      />
                    }
                    sanitizeValue={sanitizePriceInput}
                    InputProps={{
                      value: state.standardPriceInput,
                      onChange: (event) =>
                        setState((prev) => ({
                          ...prev,
                          standardPriceInput: sanitizePriceInput(
                            event.target.value,
                          ),
                          error: null,
                        })),
                      placeholder: "0.00",
                      disabled: isPending,
                    }}
                  />
                </div>
              </FieldSet>

              <p className="text-muted-foreground text-sm">
                {isFreeTrial ? (
                  m.subscription_trial_review({
                    date: endDateLabel,
                    price: "",
                  })
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <CurrencyText
                      currencyCode={state.currency}
                      amount={
                        Number.isFinite(overridePrice) ? overridePrice : 0
                      }
                    />
                    <span>
                      · {m.subscription_timeline_until({ date: endDateLabel })}{" "}
                      ·
                    </span>
                    <CurrencyText
                      currencyCode={state.currency}
                      amount={
                        Number.isFinite(standardPrice) ? standardPrice : 0
                      }
                    />
                  </span>
                )}
              </p>

              {state.error && (
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="mt-2 gap-2 [&>button]:w-full sm:[&>button]:w-auto">
              <Button
                variant="outline"
                disabled={isPending}
                onClick={closeModal}
              >
                {m.common_actions_cancel()}
              </Button>
              <Button onClick={handleConfirm} disabled={isPending}>
                {isPending && <Spinner />}
                {mode === "trial"
                  ? m.subscription_trial_confirm()
                  : m.subscription_introDiscount_confirm()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    },
  );
