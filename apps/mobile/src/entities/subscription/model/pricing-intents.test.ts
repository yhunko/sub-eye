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
  // TWO, not three. A free stretch is a temporary price of zero, so it shares
  // the one entry rather than sitting beside it as an identical second form.
  it("always offers the two that create a phase — an action that appears\n     only sometimes reads as a bug", () => {
    expect(pricingIntentsFor({ upcomingPhase: null })).toEqual([
      "schedule",
      "temporary",
    ]);
  });

  it("offers the queued change for anything waiting that is not the reversion", () => {
    expect(
      pricingIntentsFor({ upcomingPhase: phase("scheduledChange") }),
    ).toContain("pending");
    // A temporary price starting at the next payment is pending too. Without
    // this, an offer the user had just scheduled could not be inspected or
    // cancelled — only overwritten by scheduling another one.
    expect(pricingIntentsFor({ upcomingPhase: phase("intro") })).toContain(
      "pending",
    );
    expect(pricingIntentsFor({ upcomingPhase: phase("trial") })).toContain(
      "pending",
    );
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
    expect(pricingIntentsFor(undefined)).toEqual(["schedule", "temporary"]);
  });
});

describe("queuedPriceChange / offerReversion", () => {
  it("each claims only its own kind, so neither can act on the other's phase", () => {
    const scheduled = { upcomingPhase: phase("scheduledChange") };
    const reverting = { upcomingPhase: phase("standard") };

    expect(queuedPriceChange(scheduled)?.kind).toBe("scheduledChange");
    expect(queuedPriceChange({ upcomingPhase: phase("intro") })?.kind).toBe(
      "intro",
    );
    expect(queuedPriceChange(reverting)).toBeNull();
    expect(offerReversion(reverting)?.kind).toBe("standard");
    expect(offerReversion(scheduled)).toBeNull();
  });
});
