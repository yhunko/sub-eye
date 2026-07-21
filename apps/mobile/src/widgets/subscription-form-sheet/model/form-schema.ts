export type SubscriptionPeriodValue = "day" | "week" | "month" | "year";

export type SubscriptionFormValues = {
  name: string;
  cost: string;
  currency: string;
  every: string;
  period: SubscriptionPeriodValue;
  paymentDate: Date;
  categoryId: string | null;
  /** The optional starting offer. Only meaningful when creating. */
  offerMode: "none" | "trial" | "intro";
  offerCost: string;
  offerEndsAt: Date | null;
};

export type ParsedSubscriptionForm = {
  name: string;
  cost: number;
  currency: string;
  every: number;
  period: SubscriptionPeriodValue;
  paymentDate: string;
  categoryId: string | null;
  intro: { kind: "trial" | "intro"; promoCost: number; endsAt: string } | null;
};

/**
 * Codes, not sentences. Keeping the copy out of here means this module never
 * imports the Paraglide runtime — which reaches expo-localization and the native
 * layer — so it stays a plain unit under test. The sheet maps each code to its
 * m.validation_* message.
 */
export type FormErrorCode =
  | "required"
  | "invalidNumber"
  | "positiveNumber"
  | "wholeNumber"
  | "futureDate";

export type FormErrors = Partial<
  Record<keyof SubscriptionFormValues, FormErrorCode>
>;

/**
 * Accepts "1 299,50" and "1299.50" alike — a numeric keypad in a uk-UA locale
 * emits a comma, and a user pasting a price brings the grouping with it.
 * Returns null when there is no number in there at all.
 */
function parsePrice(input: string): number | null {
  const normalized = input.replace(/\s/g, "").replace(",", ".");
  if (normalized === "" || normalized === ".") return null;
  if (!/^\d*\.?\d*$/.test(normalized)) return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function makeInitialFormValues({
  preferredCurrency,
  subscription,
}: {
  preferredCurrency: string;
  subscription?: {
    name: string;
    cost: number;
    currency: string;
    every: number;
    period: SubscriptionPeriodValue;
    paymentDate: string;
    categoryId: string | null;
  };
}): SubscriptionFormValues {
  return {
    name: subscription?.name ?? "",
    cost: subscription ? String(subscription.cost) : "",
    // The stored preference, not a hardcoded "usd" — the defect this replaces.
    currency: subscription?.currency ?? preferredCurrency,
    every: subscription ? String(subscription.every) : "1",
    period: subscription?.period ?? "month",
    paymentDate: subscription ? new Date(subscription.paymentDate) : new Date(),
    categoryId: subscription?.categoryId ?? null,
    // An offer is a creation-time concept; editing one is what the
    // manage-pricing sheet is for.
    offerMode: "none",
    offerCost: "",
    offerEndsAt: null,
  };
}

export function validateSubscriptionForm(
  values: SubscriptionFormValues,
):
  | { ok: true; value: ParsedSubscriptionForm }
  | { ok: false; errors: FormErrors } {
  const errors: FormErrors = {};

  const name = values.name.trim();
  if (name.length === 0) errors.name = "required";

  const cost = parsePrice(values.cost);
  if (cost === null) errors.cost = "invalidNumber";
  else if (cost <= 0) errors.cost = "positiveNumber";

  const currency = values.currency.trim().toLowerCase();
  if (currency.length < 3) errors.currency = "required";

  const everyRaw = values.every.trim();
  const every = /^\d+$/.test(everyRaw) ? Number(everyRaw) : null;
  if (every === null) errors.every = "wholeNumber";
  else if (every < 1) errors.every = "positiveNumber";

  let intro: ParsedSubscriptionForm["intro"] = null;

  if (values.offerMode !== "none") {
    // Rule 1, moved out of the browser: the offer has to end in the future.
    if (!values.offerEndsAt || values.offerEndsAt.getTime() <= Date.now()) {
      errors.offerEndsAt = "futureDate";
    }

    const offerRaw = values.offerCost.trim();
    // A blank price on a free trial means free. On an intro it means unanswered,
    // and blank must not quietly become a 0 the server then rejects.
    const promoCost =
      offerRaw === "" && values.offerMode === "trial"
        ? 0
        : parsePrice(offerRaw);

    if (promoCost === null) errors.offerCost = "invalidNumber";
    // Rule 2: a "discount" of nothing is a free trial. Forcing the distinction
    // keeps the price timeline honest about what was signed up for.
    else if (values.offerMode === "intro" && promoCost <= 0) {
      errors.offerCost = "positiveNumber";
    }

    if (!errors.offerEndsAt && !errors.offerCost && values.offerEndsAt) {
      intro = {
        kind: values.offerMode,
        promoCost: promoCost ?? 0,
        endsAt: values.offerEndsAt.toISOString(),
      };
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      cost: cost as number,
      currency,
      every: every as number,
      period: values.period,
      paymentDate: values.paymentDate.toISOString(),
      categoryId: values.categoryId,
      intro,
    },
  };
}
