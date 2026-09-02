import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useNavigation } from "expo-router";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  subscriptionDetailQuery,
  useCreateSubscription,
  useUpdateSubscription,
} from "@/entities/subscription";
import { preferencesQuery } from "@/entities/user";
import {
  promptFlags,
  promptSession,
  remindersOfferDue,
} from "@/shared/lib/prompts";
import {
  type FormErrors,
  makeInitialFormValues,
  type SubscriptionFormValues,
  validateSubscriptionForm,
} from "./form-schema";

type FormContextValue = {
  /** `undefined` while creating; an id means editing. */
  id: string | undefined;
  values: SubscriptionFormValues;
  errors: FormErrors;
  set: <K extends keyof SubscriptionFormValues>(
    key: K,
    value: SubscriptionFormValues[K],
  ) => void;
  /**
   * Validate only these fields. A step gates its Next on what it actually
   * shows, so nothing fails validation on a screen the user has already left.
   */
  check: (fields: readonly (keyof SubscriptionFormValues)[]) => boolean;
  /** `false` when nothing was written — the values did not validate. */
  submit: () => boolean;
  /** Dismisses the whole modal, from any step inside it. */
  close: () => void;
};

const FormContext = createContext<FormContextValue | null>(null);

/**
 * Add/edit form state, hoisted to the modal's own layout.
 *
 * The category picker is a SEPARATE SCREEN pushed onto this modal's stack, so it
 * cannot reach the form's `useState` — and unlike the list filters this must not
 * be a module store, because a half-typed subscription is per-instance state
 * that has to die with the modal. React context does exactly that: the provider
 * lives in `form/_layout.tsx`, so both screens read it and it unmounts when the
 * modal closes.
 */
export function SubscriptionFormProvider({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  // NOT a router `back`: this provider wraps the modal's own Stack, so its
  // navigation object is the ROOT one and `goBack` here pops the modal itself.
  // A POP dispatched from inside the nested stack is clamped to that stack, so
  // from step 3 it would only walk back to step 1.
  const navigation = useNavigation();
  const client = useQueryClient();

  const { data: preferences } = useQuery(preferencesQuery());
  const { data: subscription } = useQuery({
    ...subscriptionDetailQuery(client, id ?? ""),
    enabled: Boolean(id),
  });

  const create = useCreateSubscription();
  const update = useUpdateSubscription();

  const [values, setValues] = useState<SubscriptionFormValues>(() =>
    makeInitialFormValues({ preferredCurrency: "usd" }),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  // Preferences and the subscription arrive asynchronously, so the form is
  // seeded when they land — but once PER SUBSCRIPTION. The detail query
  // refetches on mount, and re-seeding on every change would wipe whatever the
  // user had typed by the time the response came back.
  //
  // Keyed on `id` rather than a plain "have I run" flag, because `id` itself can
  // arrive late: a cold deep link builds the navigation state around this
  // layout, so the first render sees no params and the form would seed itself
  // empty and then refuse to seed again when the real id turned up. `false` is
  // the never-seeded marker — `undefined` is a legitimate id, meaning "create".
  const seeded = useRef<string | undefined | false>(false);
  useEffect(() => {
    if (!preferences || seeded.current === id) return;
    if (id && !subscription) return;
    seeded.current = id;

    setValues(
      makeInitialFormValues({
        preferredCurrency: preferences.preferredCurrency,
        subscription: subscription && {
          name: subscription.name,
          cost: subscription.cost,
          currency: subscription.currency,
          every: subscription.every,
          period: subscription.period,
          paymentDate: subscription.paymentDate,
          categoryId: subscription.categoryId,
          brandDomain: subscription.brandDomain,
        },
      }),
    );
  }, [preferences, subscription, id]);

  const set = <K extends keyof SubscriptionFormValues>(
    key: K,
    value: SubscriptionFormValues[K],
  ) => setValues((previous) => ({ ...previous, [key]: value }));

  const check = (fields: readonly (keyof SubscriptionFormValues)[]) => {
    const result = validateSubscriptionForm(values);
    if (result.ok) {
      setErrors({});
      return true;
    }

    const own: FormErrors = {};
    for (const field of fields) {
      const code = result.errors[field];
      if (code) own[field] = code;
    }
    setErrors(own);
    return Object.keys(own).length === 0;
  };

  const submit = (): boolean => {
    // The nav-bar item stays hit-testable through the modal's dismissal
    // animation, and create is not idempotent — a second tap is a second
    // subscription. Same guard the category picker's create path uses.
    if (create.isPending || update.isPending) return false;

    const result = validateSubscriptionForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return false;
    }
    setErrors({});

    // `categoryId` is always a real server id by now: the picker creates a new
    // category on the spot and stores what it gets back, so submit no longer
    // carries a "create this first" sentinel through the write path.
    if (id) {
      const { intro: _intro, ...changes } = result.value;
      update.mutate({ id, changes });
    } else {
      create.mutate(result.value);
    }

    // The ONE moment the user is demonstrably thinking about being reminded of
    // a payment: they have just written one down. Creating only — an edit is
    // housekeeping on something they already track and says nothing about
    // whether they want to hear from the app.
    //
    // OVER the form, and the form stays up behind it. Waiting for the modal to
    // close first put the offer on whatever screen happened to be underneath,
    // where it reads as an interruption arriving out of nowhere rather than as
    // the last step of the thing just finished. `DatesStepPage` closes the form
    // when this sheet goes away — by Done or by swipe, it does not matter which.
    if (!id && !promptSession.taken() && remindersOfferDue()) {
      promptSession.take();
      // Marked on SHOW, not on accept: a sheet the user dismissed is an answer,
      // and re-offering it on every save is the nagging this avoids.
      promptFlags.markRemindersAsked();
      router.push("/reminders");
      return true;
    }

    // Edit is optimistic and create seeds the cache on success, so dismissing
    // straight away is correct: there is nothing left to wait for on screen.
    navigation.goBack();
    return true;
  };

  return (
    <FormContext.Provider
      value={{
        id,
        values,
        errors,
        set,
        check,
        submit,
        close: () => navigation.goBack(),
      }}
    >
      {children}
    </FormContext.Provider>
  );
}

export function useSubscriptionForm(): FormContextValue {
  const context = useContext(FormContext);
  if (!context) {
    // Only reachable by rendering a form screen outside form/_layout.tsx, which
    // is a routing mistake, not a runtime condition worth a fallback.
    throw new Error("useSubscriptionForm must be used inside the form layout");
  }
  return context;
}
