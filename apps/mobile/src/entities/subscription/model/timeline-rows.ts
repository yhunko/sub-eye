import type { PricePhaseDto } from "@subeye/model";
// Straight from the money module, not the format barrel: the barrel also carries
// `when`, which reaches the Paraglide runtime and drags the whole i18n/native
// stack in behind a currency format.
import { formatMoney } from "@/shared/lib/format/money";

export type TimelineRow = {
  id: string;
  /** "₴1,299.00" */
  price: string;
  /** "Mar 2026" */
  from: string;
  /** "Jun 2026", or null when the phase is open-ended. */
  to: string | null;
  kind: PricePhaseDto["kind"];
  isActive: boolean;
  /**
   * The phase has not started yet. `kind` alone cannot say this: a
   * `scheduledChange` keeps that kind forever, so a change the user already
   * applied is indistinguishable from one still pending without it.
   */
  isUpcoming: boolean;
};

/**
 * Month + year only. A price schedule is read as "what did I pay, roughly
 * when" — a day-level timestamp on every row is noise that makes the column
 * harder to scan.
 */
function formatMonth(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/**
 * Presents the assembled price schedule.
 *
 * It only formats. The phase projection owns the order (ascending by
 * `startsAt`), the gap-filling, which phase is active and which is upcoming —
 * re-deriving any of that here, with a second clock, is how the timeline and
 * the price the user is charged end up disagreeing.
 *
 * It deliberately returns `kind` and bare date strings rather than finished
 * copy, so the module stays free of the Paraglide runtime: the widget wraps
 * `from`/`to` in m.phase_range / m.phase_since and maps `kind` to its label.
 */
export function toTimelineRows(
  phases: readonly PricePhaseDto[],
  locale: string,
  upcomingPhaseId: string | null = null,
): TimelineRow[] {
  return phases.map((phase) => ({
    id: phase.id,
    price: formatMoney(phase.cost, phase.currency),
    from: formatMonth(phase.startsAt, locale),
    to: phase.endsAt ? formatMonth(phase.endsAt, locale) : null,
    kind: phase.kind,
    isActive: phase.isActive,
    isUpcoming: phase.id === upcomingPhaseId,
  }));
}
