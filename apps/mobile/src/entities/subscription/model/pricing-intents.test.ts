import { describe, expect, it } from "bun:test";
import type { PricePhaseDto } from "@subeye/model";
import {
  offerReversion,
  pricingIntentsFor,
  queuedPriceChange,
} from "./pricing-intents";

const phase = (kind: PricePhaseDto["kind"]): PricePhaseDto =>
  ({ id: `${kind}-1`, kind }) as PricePhaseDto;

describe("pricingIntentsFor", () => {
  it("always offers the three that create a phase — an action that appears\n     only sometimes reads as a bug", () => {
    expect(pricingIntentsFor({ upcomingPhase: null })).toEqual([
      "schedule",
      "trial",
      "intro",
    ]);
  });

  it("offers the queued change only when the upcoming phase IS one", () => {
    expect(
      pricingIntentsFor({ upcomingPhase: phase("scheduledChange") }),
    ).toContain("pending");
    expect(
      pricingIntentsFor({ upcomingPhase: phase("standard") }),
    ).not.toContain("pending");
  });

  it("offers ending the offer only when the upcoming phase is the reversion —\n     a queued scheduledChange must not be mistaken for a running offer", () => {
    expect(pricingIntentsFor({ upcomingPhase: phase("standard") })).toContain(
      "endOffer",
    );
    expect(
      pricingIntentsFor({ upcomingPhase: phase("scheduledChange") }),
    ).not.toContain("endOffer");
  });

  it("tolerates a subscription that has not loaded yet", () => {
    expect(pricingIntentsFor(undefined)).toEqual([
      "schedule",
      "trial",
      "intro",
    ]);
  });
});

describe("queuedPriceChange / offerReversion", () => {
  it("each claims only its own kind, so neither can act on the other's phase", () => {
    const scheduled = { upcomingPhase: phase("scheduledChange") };
    const reverting = { upcomingPhase: phase("standard") };

    expect(queuedPriceChange(scheduled)?.kind).toBe("scheduledChange");
    expect(queuedPriceChange(reverting)).toBeNull();
    expect(offerReversion(reverting)?.kind).toBe("standard");
    expect(offerReversion(scheduled)).toBeNull();
  });
});
