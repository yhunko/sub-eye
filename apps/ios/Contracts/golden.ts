import { deriveSubscriptionStatus } from "../../../packages/lifecycle/src/status";
import type { SubscriptionPeriod } from "../../../packages/model/src";
import { CurrencyUtils } from "../../../packages/money/src/currency";
import {
  getEffectivePhase,
  getUpcomingPhase,
} from "../../../packages/pricing/src/phaseSelection";
import { isOccurrencePaused } from "../../../packages/spend/src/pause";
import {
  type RecurrencePeriod,
  RecurrenceUtils,
} from "../../../packages/time/src/recurrence";

process.env.TZ = "UTC";
const recurrence = [
  ["2024-01-31", "2024-02-28", 1, "month"],
  ["2024-01-31", "2024-03-01", 1, "month"],
  ["2026-01-31", "2026-02-01", 1, "month"],
  ["2026-01-31", "2026-03-01", 1, "month"],
  ["2024-02-29", "2028-02-01", 1, "year"],
  ["2024-02-29", "2027-03-01", 1, "year"],
  ["2025-11-30", "2026-03-01", 3, "month"],
  ["2026-09-15", "2026-10-01", 2, "week"],
  ["2026-09-15", "2026-10-01", 3, "day"],
  ["2027-01-31", "2026-09-15", 1, "month"],
].map(([anchor, target, every, period]) => ({
  anchor,
  target,
  every,
  period,
  expected: RecurrenceUtils.getNextOccurrence(
    String(anchor),
    Number(every),
    period as RecurrencePeriod,
    new Date(String(target)),
  )
    .toISOString()
    .slice(0, 10),
}));
const usd = { usd: 1, eur: 0.9, uah: 41.2, jpy: 148.2 };
const conversions = Object.keys(usd).flatMap((from) =>
  Object.keys(usd).map((to) => {
    const targetRates = Object.fromEntries(
      Object.entries(usd).map(([key, rate]) => [
        key,
        rate / usd[to as keyof typeof usd],
      ]),
    );
    return {
      amount: 19.99,
      from,
      to,
      expected: CurrencyUtils.convert(19.99, from, to, targetRates),
    };
  }),
);
const monthly = ["day", "week", "month", "year"].flatMap((period) =>
  [1, 2, 7, 12].map((every) => ({
    period,
    every,
    amount: 19.99,
    expected: CurrencyUtils.toMonthly(
      19.99,
      every,
      period as SubscriptionPeriod,
    ),
  })),
);
const statuses = ["Europe/Kyiv", "America/Los_Angeles", "Asia/Tokyo"].flatMap(
  (zone) =>
    [
      {},
      { willBeCancelledAt: "2026-09-16T00:00:00Z" },
      { pausedAt: "2026-09-15T23:00:00Z" },
      { pausedAt: "2026-09-15T01:00:00Z", resumeAt: "2026-09-16T00:00:00Z" },
      {
        pausedAt: "2026-09-15T01:00:00Z",
        willBeCancelledAt: "2026-09-16T00:00:00Z",
      },
    ].map((input) => ({
      ...input,
      now: "2026-09-15T22:00:00Z",
      zone,
      expected: deriveSubscriptionStatus(
        input,
        new Date("2026-09-15T22:00:00Z"),
        zone,
      ),
    })),
);
const phases = [
  { id: "standard", startsAt: "2026-10-01T00:00:00Z" },
  {
    id: "trial",
    startsAt: "2026-09-01T00:00:00Z",
    endsAt: "2026-09-15T00:00:00Z",
  },
  {
    id: "intro",
    startsAt: "2026-09-15T00:00:00Z",
    endsAt: "2026-10-01T00:00:00Z",
  },
];
const pricing = [
  "2026-08-31T23:59:59Z",
  "2026-09-01T00:00:00Z",
  "2026-09-14T23:59:59Z",
  "2026-09-15T00:00:00Z",
  "2026-09-30T23:59:59Z",
  "2026-10-01T00:00:00Z",
  "2027-01-01T00:00:00Z",
].map((now) => ({
  now,
  phases,
  effective: getEffectivePhase(phases, new Date(now))?.id ?? null,
  upcoming: getUpcomingPhase(phases, new Date(now))?.id ?? null,
}));
const pauses = [
  {},
  { pausedAt: "2026-09-15T12:00:00Z" },
  { pausedAt: "2026-09-15T12:00:00Z", resumeAt: "2026-10-01T00:00:00Z" },
].flatMap((window) =>
  [
    "2026-09-15T00:00:00Z",
    "2026-09-15T12:00:00Z",
    "2026-09-30T23:59:59Z",
    "2026-10-01T00:00:00Z",
  ].map((occurrence) => ({
    ...window,
    occurrence,
    expected: isOccurrencePaused(window, new Date(occurrence)),
  })),
);
const golden = {
  v: 1,
  usd,
  recurrence,
  conversions,
  monthly,
  statuses,
  pricing,
  pauses,
};
if (process.argv.includes("--generate"))
  console.log(JSON.stringify(golden, null, 2));
else {
  const saved = await Bun.file(
    new URL(
      "../SubEyeCore/Tests/SubEyeCoreTests/Fixtures/golden-v1.json",
      import.meta.url,
    ),
  ).json();
  if (JSON.stringify(golden) !== JSON.stringify(saved))
    throw new Error(
      "TypeScript domain behavior differs from native golden vectors. Review both implementations before regenerating.",
    );
  console.log(
    `Verified ${recurrence.length + conversions.length + monthly.length + statuses.length + pricing.length + pauses.length} shared domain vectors.`,
  );
}
