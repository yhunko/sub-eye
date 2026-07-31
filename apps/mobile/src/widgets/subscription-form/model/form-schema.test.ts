import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import {
  makeInitialFormValues,
  normalizeBrandDomain,
  type SubscriptionFormValues,
  validateSubscriptionForm,
} from "./form-schema";

const base: SubscriptionFormValues = {
  name: "Netflix",
  cost: "299",
  currency: "uah",
  every: "1",
  period: SubscriptionPeriod.MONTH,
  // Local, not `new Date("…Z")` — this is what a date picker hands back, and
  // the whole point of the coercion is that the two are not the same day.
  paymentDate: new Date(2026, 8, 1),
  categoryId: null,
  brandDomain: "",
  offerMode: "none",
  offerCost: "",
  offerEndsAt: null,
};

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);
const yesterday = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

describe("makeInitialFormValues", () => {
  // The retired web form hardcoded `currency: "usd"` in its defaultValues
  // despite a stored preference. This is the regression guard.
  it("defaults the currency to the user's preferred currency, not usd", () => {
    expect(makeInitialFormValues({ preferredCurrency: "uah" }).currency).toBe(
      "uah",
    );
  });

  it("prefills from an existing subscription when editing", () => {
    const values = makeInitialFormValues({
      preferredCurrency: "uah",
      subscription: {
        name: "Spotify",
        cost: 149.5,
        currency: "usd",
        every: 3,
        period: SubscriptionPeriod.MONTH,
        paymentDate: "2026-08-15T00:00:00.000Z",
        categoryId: "cat-1",
        brandDomain: "spotify.com",
      },
    });

    expect(values).toMatchObject({
      name: "Spotify",
      cost: "149.5",
      currency: "usd",
      every: "3",
      categoryId: "cat-1",
      brandDomain: "spotify.com",
    });
    // The picker reads local components, so a stored UTC day rebuilt as an
    // instant shows the day before west of UTC — and saving an untouched form
    // then writes that earlier day back.
    expect(values.paymentDate.getMonth()).toBe(7);
    expect(values.paymentDate.getDate()).toBe(15);
  });
});

describe("validateSubscriptionForm", () => {
  it("coerces the text inputs to numbers and an ISO date", () => {
    const result = validateSubscriptionForm(base);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // A form that posts "299" where the API expects 299 fails server-side with
    // an opaque validation error, so the coercion is the point of this module.
    expect(result.value.cost).toBe(299);
    expect(result.value.every).toBe(1);
    expect(result.value.paymentDate).toBe("2026-09-01T00:00:00.000Z");
    expect(result.value.intro).toBeNull();
  });

  it("accepts a comma decimal and spaced thousands", () => {
    const result = validateSubscriptionForm({ ...base, cost: "1 299,50" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cost).toBe(1299.5);
  });

  it("lowercases and trims the currency", () => {
    const result = validateSubscriptionForm({ ...base, currency: " UAH " });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currency).toBe("uah");
  });

  it("rejects a blank name", () => {
    const result = validateSubscriptionForm({ ...base, name: "  " });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.name).toBe("required");
  });

  it("rejects a non-positive or unparseable price", () => {
    expect(validateSubscriptionForm({ ...base, cost: "0" })).toMatchObject({
      ok: false,
      errors: { cost: "positiveNumber" },
    });
    expect(validateSubscriptionForm({ ...base, cost: "abc" })).toMatchObject({
      ok: false,
      errors: { cost: "invalidNumber" },
    });
  });

  it("rejects a fractional cycle length", () => {
    expect(validateSubscriptionForm({ ...base, every: "1.5" })).toMatchObject({
      ok: false,
      errors: { every: "wholeNumber" },
    });
  });

  it("rejects a past offer end date", () => {
    const result = validateSubscriptionForm({
      ...base,
      offerMode: "trial",
      offerEndsAt: yesterday(),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.offerEndsAt).toBe("futureDate");
  });

  // The two rules the retired browser form owned, now enforced on both sides:
  // an intro discount must cost something, a free trial may cost nothing.
  it("rejects a zero intro price but allows a zero trial price", () => {
    expect(
      validateSubscriptionForm({
        ...base,
        offerMode: "intro",
        offerCost: "0",
        offerEndsAt: tomorrow(),
      }),
    ).toMatchObject({ ok: false, errors: { offerCost: "positiveNumber" } });

    const trial = validateSubscriptionForm({
      ...base,
      offerMode: "trial",
      offerCost: "0",
      offerEndsAt: tomorrow(),
    });
    expect(trial.ok).toBe(true);
    if (!trial.ok) return;
    expect(trial.value.intro).toEqual({
      kind: "trial",
      promoCost: 0,
      endsAt: trial.value.intro?.endsAt ?? "",
    });
  });

  it("reads a blank trial price as free, but still rejects gibberish", () => {
    expect(
      validateSubscriptionForm({
        ...base,
        offerMode: "trial",
        offerCost: "",
        offerEndsAt: tomorrow(),
      }).ok,
    ).toBe(true);

    expect(
      validateSubscriptionForm({
        ...base,
        offerMode: "trial",
        offerCost: "free",
        offerEndsAt: tomorrow(),
      }),
    ).toMatchObject({ ok: false, errors: { offerCost: "invalidNumber" } });
  });

  it("normalizes the brand domain on the way out", () => {
    const result = validateSubscriptionForm({
      ...base,
      brandDomain: "  HTTPS://WWW.Netflix.com/browse?x=1  ",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.brandDomain).toBe("netflix.com");
  });

  it("drops the offer entirely when the mode is none", () => {
    const result = validateSubscriptionForm({
      ...base,
      offerMode: "none",
      offerCost: "5",
      offerEndsAt: yesterday(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.intro).toBeNull();
  });
});

describe("normalizeBrandDomain", () => {
  // Each case is a shape a real person types. A wrong answer here is a broken
  // image request, not a crash, which is exactly why it needs a test.
  it("keeps a bare host untouched", () => {
    expect(normalizeBrandDomain("netflix.com")).toBe("netflix.com");
  });

  it("strips scheme, www, path, query and port", () => {
    expect(normalizeBrandDomain("https://www.netflix.com:443/browse?x=1")).toBe(
      "netflix.com",
    );
  });

  it("lowercases and trims", () => {
    expect(normalizeBrandDomain("  Netflix.COM ")).toBe("netflix.com");
  });

  it("keeps subdomains other than www", () => {
    expect(normalizeBrandDomain("music.youtube.com")).toBe("music.youtube.com");
  });

  it("rejects a brand name with no dot rather than sending it", () => {
    expect(normalizeBrandDomain("Netflix")).toBeNull();
  });

  it("rejects empty and dot-only input", () => {
    expect(normalizeBrandDomain("")).toBeNull();
    expect(normalizeBrandDomain("   ")).toBeNull();
    expect(normalizeBrandDomain(".com")).toBeNull();
    expect(normalizeBrandDomain("netflix.")).toBeNull();
  });
});
