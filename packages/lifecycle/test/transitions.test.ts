import { describe, expect, test } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { cancel, pause, renew, resume } from "../src";

// Every case names a timezone. Left off, `currentCalendarDay` falls back to the
// process calendar and these assertions flip with `TZ` — and the services that
// call these functions always have the account's zone in hand anyway.
const UTC = "UTC";

const base = {
  paymentDate: "2026-09-15T00:00:00.000Z",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  willBeCancelledAt: null,
  pausedAt: null,
  resumeAt: null,
};

describe("cancel", () => {
  // "Access ends now" must floor to the account's current calendar DAY, not the
  // instant. Left unfloored it reads as `cancelling` for the rest of that day —
  // a subscription the user just killed still advertising itself as live.
  test("immediate ends on today's calendar day", () => {
    const patch = cancel(
      base,
      "immediate",
      new Date("2026-08-24T18:30:00.000Z"),
      UTC,
    );
    expect(patch.willBeCancelledAt).toBe("2026-08-24T00:00:00.000Z");
  });

  // The `Z` form, not `+00:00`: `toCalendarDay` hands back a `TZDate` whose own
  // `toISOString()` emits the offset form, and both clients slice and
  // string-compare these as plain UTC instants.
  test("periodEnd ends when the current paid period does", () => {
    const patch = cancel(
      base,
      "periodEnd",
      new Date("2026-08-24T18:30:00.000Z"),
      UTC,
    );
    expect(patch.willBeCancelledAt).toBe("2026-09-15T00:00:00.000Z");
  });

  // Cancelling touches the cancellation column and nothing else. Clearing the
  // pause here would resurrect billing on a subscription on its way out.
  test("leaves every other column alone", () => {
    const paused = { ...base, pausedAt: "2026-08-01T09:00:00.000Z" };
    expect(
      Object.keys(
        cancel(paused, "periodEnd", new Date("2026-08-24T00:00:00.000Z"), UTC),
      ),
    ).toEqual(["willBeCancelledAt"]);
  });
});

describe("renew", () => {
  // Renew clears BOTH the cancellation and the pause. Clearing only the
  // cancellation leaves a subscription that reads active and bills nothing.
  test("clears cancellation and pause together", () => {
    const patch = renew(
      {
        ...base,
        willBeCancelledAt: "2026-09-15T00:00:00.000Z",
        pausedAt: "2026-08-01T09:00:00.000Z",
        resumeAt: null,
      },
      null,
      new Date("2026-08-24T00:00:00.000Z"),
    );
    expect(patch.willBeCancelledAt).toBeNull();
    expect(patch.pausedAt).toBeNull();
    expect(patch.resumeAt).toBeNull();
  });

  test("re-anchors the cycle when given a past start date", () => {
    const patch = renew(
      base,
      "2026-08-03T00:00:00.000Z",
      new Date("2026-08-24T00:00:00.000Z"),
    );
    expect(patch.paymentDate).toBe("2026-08-03T00:00:00.000Z");
  });

  // A null paymentDate must leave the anchor ALONE, not write undefined over it.
  // A `cancelling` subscription never stopped billing, so moving its anchor
  // would shift a cycle that was never interrupted.
  test("omits paymentDate entirely when none is given", () => {
    const patch = renew(base, null, new Date("2026-08-24T00:00:00.000Z"));
    expect("paymentDate" in patch).toBe(false);
  });
});

describe("pause", () => {
  // pausedAt is an INSTANT and must stay one. Floored to its day it reads as
  // "paused since midnight", and a charge actually taken that morning would be
  // excluded from spend — a pause silently rewriting money already spent.
  test("records the instant, not the day", () => {
    const patch = pause(base, null, new Date("2026-08-24T18:30:00.000Z"), UTC);
    expect(patch?.pausedAt).toBe("2026-08-24T18:30:00.000Z");
    expect(patch?.resumeAt).toBeNull();
  });

  // The guard is "already paused", NOT "not active". A `cancelling`
  // subscription can be paused by the service today — getAllowedActions does not
  // offer it, so no UI reaches it, but the service permits it and this port must
  // not quietly change that.
  test("returns null only when already paused", () => {
    const paused = { ...base, pausedAt: "2026-08-01T09:00:00.000Z" };
    expect(
      pause(paused, null, new Date("2026-08-24T00:00:00.000Z"), UTC),
    ).toBeNull();

    const cancelling = {
      ...base,
      willBeCancelledAt: "2026-09-15T00:00:00.000Z",
    };
    expect(
      pause(cancelling, null, new Date("2026-08-24T00:00:00.000Z"), UTC),
    ).not.toBeNull();
  });

  // A dated pause that has lapsed on its own derives to `active`, so pausing it
  // again is legal. Guarding on the stored column instead would leave the row
  // stuck unpausable forever.
  test("pauses again once a dated pause has lapsed", () => {
    const lapsed = {
      ...base,
      pausedAt: "2026-06-01T09:00:00.000Z",
      resumeAt: "2026-07-01T00:00:00.000Z",
    };
    expect(
      pause(lapsed, null, new Date("2026-08-24T00:00:00.000Z"), UTC),
    ).not.toBeNull();
  });

  // resumeAt is stored as the caller sent it. The client floors it with
  // toIsoDay and the valibot schema validates it; the service does not floor
  // again, and adding a floor here would be a behaviour change, not a port.
  test("passes resumeAt through unfloored", () => {
    const patch = pause(
      base,
      "2026-10-01T00:00:00.000Z",
      new Date("2026-08-24T18:30:00.000Z"),
      UTC,
    );
    expect(patch?.resumeAt).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("resume", () => {
  // The anchor must roll forward past the pause window, or the next payment
  // date still points at a charge that never happened.
  test("rolls the payment date past the pause", () => {
    const paused = {
      ...base,
      paymentDate: "2026-06-15T00:00:00.000Z",
      pausedAt: "2026-06-01T09:00:00.000Z",
      resumeAt: null,
    };
    const patch = resume(paused, new Date("2026-08-24T00:00:00.000Z"), UTC);
    expect(patch?.paymentDate).toBe("2026-09-15T00:00:00.000Z");
    expect(patch?.pausedAt).toBeNull();
    expect(patch?.resumeAt).toBeNull();
  });

  test("returns null when the subscription is not paused", () => {
    expect(resume(base, new Date("2026-08-24T00:00:00.000Z"), UTC)).toBeNull();
  });

  // The stored column still says `paused`, but a lapsed dated pause reads
  // `active` everywhere the user can see it — rolling its anchor would move the
  // cycle of a subscription that is billing normally.
  test("returns null once a dated pause has lapsed on its own", () => {
    const lapsed = {
      ...base,
      pausedAt: "2026-06-01T09:00:00.000Z",
      resumeAt: "2026-07-01T00:00:00.000Z",
    };
    expect(
      resume(lapsed, new Date("2026-08-24T00:00:00.000Z"), UTC),
    ).toBeNull();
  });
});
