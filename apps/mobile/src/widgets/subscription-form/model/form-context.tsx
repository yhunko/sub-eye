import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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
  submit: () => void;
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
  const router = useRouter();
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
  // seeded when they land — but ONCE. The detail query refetches on mount, and
  // re-seeding on every change would wipe whatever the user had typed by the
  // time the response came back.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !preferences) return;
    if (id && !subscription) return;
    seeded.current = true;

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

  const submit = () => {
    // The nav-bar item stays hit-testable through the modal's dismissal
    // animation, and create is not idempotent — a second tap is a second
    // subscription. Same guard the category picker's create path uses.
    if (create.isPending || update.isPending) return;

    const result = validateSubscriptionForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
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

    // Edit is optimistic and create seeds the cache on success, so dismissing
    // straight away is correct: there is nothing left to wait for on screen.
    router.back();
  };

  return (
    <FormContext.Provider value={{ id, values, errors, set, submit }}>
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
