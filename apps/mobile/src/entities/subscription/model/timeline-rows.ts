import type { PricePhaseDto } from "@subeye/shared";
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
 * Presents the server-assembled price schedule.
 *
 * It only formats. The server owns the order (ascending by `startsAt`), the
 * gap-filling and which phase is active — re-deriving any of that here is how
 * the client and the server end up disagreeing about what the user pays.
 *
 * It deliberately returns `kind` and bare date strings rather than finished
 * copy, so the module stays free of the Paraglide runtime: the widget wraps
 * `from`/`to` in m.phase_range / m.phase_since and maps `kind` to its label.
 */
export function toTimelineRows(
  phases: readonly PricePhaseDto[],
  locale: string,
): TimelineRow[] {
  return phases.map((phase) => ({
    id: phase.id,
    price: formatMoney(phase.cost, phase.currency),
    from: formatMonth(phase.startsAt, locale),
    to: phase.endsAt ? formatMonth(phase.endsAt, locale) : null,
    kind: phase.kind,
    isActive: phase.isActive,
  }));
}
