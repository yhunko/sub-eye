import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "shared";
import { decodeBase64Url, encodeBase64Url } from "../src/shared/lib/base64";
import {
  createDefaultComparatorWizardPersistentState,
  restoreComparatorWizardPersistentState,
  serializeComparatorWizardPersistentState,
} from "../src/features/subscription/comparator/model/comparator-wizard-persistence";

describe("comparator wizard persistence", () => {
  it("round-trips utf-8 content through shared base64url helpers", () => {
    const encoded = encodeBase64Url("Порівняння планів");

    expect(decodeBase64Url(encoded)).toBe("Порівняння планів");
  });

  it("omits draft for default state", () => {
    const state = createDefaultComparatorWizardPersistentState("sub_123");
    const draft = serializeComparatorWizardPersistentState({
      state,
      prefillSubscriptionId: "sub_123",
    });

    expect(draft).toBeUndefined();
  });

  it("round-trips non-default state via URL draft", () => {
    const state = {
      ...createDefaultComparatorWizardPersistentState("sub_123"),
      step: 4 as const,
      mode: "manualVsManual" as const,
      currentExistingId: "",
      currentManual: {
        name: "Current plan",
        amountInput: "12.49",
        currency: "eur",
        everyInput: "1",
        period: SubscriptionPeriod.MONTH,
      },
      candidateManual: {
        name: "New option",
        amountInput: "99",
        currency: "usd",
        everyInput: "12",
        period: SubscriptionPeriod.YEAR,
      },
      comparison: {
        payload: {
          currentPlan: {
            source: "manual",
            name: "Current plan",
            amount: 12.49,
            currency: "eur",
            every: 1,
            period: SubscriptionPeriod.MONTH,
          },
          candidatePlan: {
            source: "manual",
            name: "New option",
            amount: 99,
            currency: "usd",
            every: 12,
            period: SubscriptionPeriod.YEAR,
          },
        },
        response: {
          result: {
            preferredCurrencyCode: "usd",
            currentPlan: {
              source: "manual",
              subscriptionId: null,
              name: "Current plan",
              every: 1,
              period: SubscriptionPeriod.MONTH,
              currencyCode: "usd",
              immediateCharge: 13.2,
              monthlyAmount: 13.2,
              yearlyAmount: 158.4,
            },
            candidatePlan: {
              source: "manual",
              subscriptionId: null,
              name: "New option",
              every: 12,
              period: SubscriptionPeriod.YEAR,
              currencyCode: "usd",
              immediateCharge: 99,
              monthlyAmount: 8.25,
              yearlyAmount: 99,
            },
            delta: {
              monthlyDelta: -4.95,
              yearlyDelta: -59.4,
              monthlyPercent: -37.5,
              yearlyPercent: -37.5,
              direction: "save",
            },
            portfolioContext: {
              currentMonthlyTotal: 50,
              currentYearlyTotal: 600,
              projectedMonthlyTotal: 45.05,
              projectedYearlyTotal: 540.6,
              monthlyDelta: -4.95,
              yearlyDelta: -59.4,
            },
          },
          quota: {
            planId: "free",
            periodKey: "2026-03",
            resetsAt: "2026-04-01T00:00:00.000Z",
            used: 1,
            limit: 10,
            remaining: 9,
            isLimited: true,
          },
        },
      },
    };

    const draft = serializeComparatorWizardPersistentState({
      state,
      prefillSubscriptionId: "sub_123",
    });
    expect(draft).toBeString();

    const restored = restoreComparatorWizardPersistentState({
      draft,
      prefillSubscriptionId: "sub_123",
    });

    expect(restored).toEqual(state);
  });

  it("falls back to defaults for invalid draft payloads", () => {
    const restored = restoreComparatorWizardPersistentState({
      draft: "invalid",
      prefillSubscriptionId: "sub_456",
    });

    expect(restored).toEqual(
      createDefaultComparatorWizardPersistentState("sub_456"),
    );
  });

  it("drops invalid persisted comparison state", () => {
    const invalidDraft = encodeBase64Url(
      JSON.stringify({
        v: 1,
        step: 4,
        mode: "manualVsManual",
        currentExistingId: "",
        currentManual:
          createDefaultComparatorWizardPersistentState().currentManual,
        candidateManual:
          createDefaultComparatorWizardPersistentState().candidateManual,
        comparison: {
          payload: {
            currentPlan: {
              source: "manual",
              amount: -1,
              currency: "usd",
            },
            candidatePlan: {
              source: "manual",
              amount: 10,
              currency: "usd",
            },
          },
          response: {
            result: null,
          },
        },
      }),
    );

    const restored = restoreComparatorWizardPersistentState({
      draft: invalidDraft,
    });

    expect(restored.comparison).toBeNull();
  });
});
