import { type PricePhaseKind, SubscriptionPeriod } from "@subeye/model";
import { buildPhaseProjection, type PricePhaseInput } from "@subeye/pricing";

/**
 * The signature element's numbers, computed at build time by the shipped phase
 * model rather than typed into markup.
 *
 * The page's whole argument is that a subscription's price is a timeline. If
 * the marketing numbers were hardcoded they could drift from what
 * `@subeye/pricing` actually does and nobody would notice. `buildPhaseProjection`
 * is pure and takes `now` as a parameter, so it runs in Astro frontmatter and
 * costs the visitor zero bytes.
 */

/** Fixed, not `new Date()`: a build must be reproducible for the Turbo cache. */
const ORIGIN = new Date("2026-01-01T00:00:00.000Z");

/**
 * Both spans are measured in UTC, not with date-fns' `differenceInCalendar*`.
 * A phase boundary is a calendar day stored as its UTC midnight, and those
 * helpers re-read it in the BUILD MACHINE's zone: west of UTC the standard
 * phase's 30 April midnight is still 29 April, so the page rendered the price
 * as opening in month 5. Every boundary is a UTC midnight, so the day span is
 * an exact division.
 */
const calendarDaysBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / 86_400_000);

const calendarMonthsBetween = (from: Date, to: Date) =>
  (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
  (to.getUTCMonth() - from.getUTCMonth());

const PHASES: PricePhaseInput[] = [
  {
    id: "trial",
    kind: "trial",
    cost: 0,
    currency: "usd",
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-01-31T00:00:00.000Z",
  },
  {
    id: "intro",
    kind: "intro",
    cost: 4.99,
    currency: "usd",
    startsAt: "2026-01-31T00:00:00.000Z",
    endsAt: "2026-04-30T00:00:00.000Z",
  },
  {
    id: "standard",
    kind: "standard",
    cost: 12.99,
    currency: "usd",
    startsAt: "2026-04-30T00:00:00.000Z",
    endsAt: null,
  },
];

export type TimelineStep = {
  kind: PricePhaseKind;
  /** Monthly cost in the preferred currency, straight off the phase DTO. */
  monthly: number;
  currency: string;
  /** Length of a bounded phase; `null` for the open-ended standard price. */
  spanDays: number | null;
  spanMonths: number | null;
  /** 1-based month this phase opens in, counting from the trial's first day. */
  startMonth: number;
  isActive: boolean;
};

const build = (): TimelineStep[] => {
  const projection = buildPhaseProjection(
    { every: 1, period: SubscriptionPeriod.MONTH },
    PHASES,
    "usd",
    { usd: 1 },
    ORIGIN,
  );

  // A build-time assertion, not defensive coding: if the phase model ever stops
  // reporting three ordered phases with the trial live on day one, the page is
  // describing a product that no longer exists and must not ship.
  if (projection.pricePhases.length !== PHASES.length) {
    throw new Error("price timeline: phase model dropped a phase");
  }
  if (projection.effectivePhaseKind !== "trial") {
    throw new Error(
      `price timeline: expected the trial to be live at the origin, got "${projection.effectivePhaseKind}"`,
    );
  }

  return projection.pricePhases.map((phase) => {
    const startsAt = new Date(phase.startsAt);
    const endsAt = phase.endsAt ? new Date(phase.endsAt) : null;

    return {
      kind: phase.kind,
      monthly: phase.billing.preferred.monthly,
      currency: phase.billing.preferred.currencyCode,
      spanDays: endsAt ? calendarDaysBetween(startsAt, endsAt) : null,
      spanMonths: endsAt ? calendarMonthsBetween(startsAt, endsAt) : null,
      startMonth: calendarMonthsBetween(ORIGIN, startsAt) + 1,
      isActive: phase.isActive,
    };
  });
};

export const priceTimeline: TimelineStep[] = build();
