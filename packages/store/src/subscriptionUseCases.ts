import type { TransitionInput, TransitionPatch } from "@subeye/lifecycle";
import {
  cancel,
  deriveSubscriptionStatus,
  pause,
  renew,
  resume,
} from "@subeye/lifecycle";
import type {
  AddSubscriptionInput,
  SubscriptionDto,
  UpdateSubscriptionInput,
} from "@subeye/model";
import { normalizeAmount, toStartOfUtcDay } from "@subeye/pricing";
import {
  AlreadyPausedError,
  NotPausedError,
  ScheduledDateMustBeFutureError,
  SubscriptionCategoryNotFoundError,
  SubscriptionNotFoundError,
} from "./errors";
import {
  buildSubscriptionDto,
  loadSubscriptionDto,
} from "./loadSubscriptionDto";
import {
  applyDuePhases,
  clearPendingPhases,
  startPhase,
} from "./phaseUseCases";
import type { Ports } from "./ports";
import type { PricePhaseRecord, SubscriptionRecord } from "./records";
import { toSubscriptionDto } from "./toSubscriptionDto";

export type CancellationMode = "periodEnd" | "immediate";

/**
 * Every subscription, mapped. The analytics composition reads this — it needs
 * the full set regardless of status, and it needs the phases, so both are
 * fetched once and grouped rather than asked for per row.
 */
export const listSubscriptions = async (
  ports: Ports,
): Promise<SubscriptionDto[]> => {
  const now = ports.now();
  const [records, preferences] = await Promise.all([
    ports.subscriptions.all(),
    ports.preferences.read(),
  ]);
  const [rates, phases, categories] = await Promise.all([
    ports.rates.forBase(preferences.preferredCurrency),
    ports.phases.all(),
    ports.categories.all(),
  ]);

  const phasesBySubscription = new Map<string, PricePhaseRecord[]>();
  for (const phase of phases) {
    const list = phasesBySubscription.get(phase.subscriptionId) ?? [];
    list.push(phase);
    phasesBySubscription.set(phase.subscriptionId, list);
  }
  const categoriesById = new Map(
    categories.map((category) => [
      category.id,
      { id: category.id, name: category.name, emoji: category.emoji },
    ]),
  );

  return records.map((record) =>
    toSubscriptionDto(
      record,
      phasesBySubscription.get(record.id) ?? [],
      preferences,
      rates,
      record.categoryId
        ? (categoriesById.get(record.categoryId) ?? null)
        : null,
      now,
    ),
  );
};

export const getSubscription = async (
  ports: Ports,
  id: string,
): Promise<SubscriptionDto> => {
  const existing = await ports.subscriptions.byId(id);
  if (!existing) throw new SubscriptionNotFoundError();

  // Lazy write-on-read, scoped to ONE subscription: if a phase boundary has
  // passed, apply it now so the row and the timeline agree. This is the only
  // read that may write, and only when there is genuinely something due.
  await applyDuePhases(ports, id);

  return loadSubscriptionDto(ports, id);
};

export const addSubscription = async (
  ports: Ports,
  input: AddSubscriptionInput,
): Promise<SubscriptionDto> => {
  await assertCategoryExists(ports, input.categoryId);

  // Validate the starting offer before any write. A host without interactive
  // transactions cannot roll a late throw back, so it would leave an orphan row
  // behind. The offer boundary is floored to the UTC day — the same flooring
  // startPhase applies — so "ends later today" must be rejected here, not after
  // the insert.
  const { intro, ...payload } = input;
  const now = ports.now();
  const preferences = await ports.preferences.read();

  const introEndsAt = intro ? toStartOfUtcDay(intro.endsAt) : null;
  if (introEndsAt && Date.parse(introEndsAt) <= now.getTime()) {
    throw new ScheduledDateMustBeFutureError();
  }

  const willBeCancelledAt = toIso(payload.willBeCancelledAt);
  const created = await ports.subscriptions.create({
    id: ports.newId(),
    name: payload.name,
    cost: normalizeAmount(payload.cost),
    currency: payload.currency,
    every: payload.every,
    period: payload.period,
    status: deriveSubscriptionStatus(
      { willBeCancelledAt, pausedAt: null, resumeAt: null },
      now,
      preferences.preferredTimezone,
    ),
    autoPaid: payload.autoPaid,
    categoryId: payload.categoryId,
    notes: payload.notes,
    brandDomain: payload.brandDomain,
    paymentDate: new Date(payload.paymentDate).toISOString(),
    willBeCancelledAt,
    pausedAt: null,
    resumeAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });

  // Start the subscription on its trial / intro offer (the standard price is
  // the cost just created). Returns the DTO with the resulting price phases.
  if (intro && introEndsAt) {
    return startPhase(ports, created.id, {
      kind: intro.kind,
      promoCost: intro.promoCost,
      currency: created.currency,
      endsAt: introEndsAt,
      standardCost: Number(created.cost),
    });
  }

  return buildSubscriptionDto(ports, created);
};

export const updateSubscription = async (
  ports: Ports,
  id: string,
  input: UpdateSubscriptionInput,
): Promise<SubscriptionDto> => {
  const existing = await ports.subscriptions.byId(id);
  if (!existing) throw new SubscriptionNotFoundError();

  await assertCategoryExists(ports, input.categoryId);

  // A direct price/currency edit supersedes any pending pricing schedule.
  if (isDirectPriceChange(existing, input)) {
    await clearPendingPhases(ports, id);
  }

  const patch = toUpdatePatch(input);
  const preferences = await ports.preferences.read();
  const updated = await ports.subscriptions.update(id, {
    ...patch,
    status: deriveSubscriptionStatus(
      { ...existing, ...patch },
      ports.now(),
      preferences.preferredTimezone,
    ),
  });

  return buildSubscriptionDto(ports, updated);
};

export const deleteSubscription = async (
  ports: Ports,
  id: string,
): Promise<void> => {
  const existing = await ports.subscriptions.byId(id);
  if (!existing) throw new SubscriptionNotFoundError();

  await ports.subscriptions.remove(id);
};

/**
 * Cancel, either at the end of the current paid period (access kept until
 * then) or right away.
 */
export const cancelSubscription = async (
  ports: Ports,
  id: string,
  mode: CancellationMode,
): Promise<SubscriptionDto> => {
  const existing = await ports.subscriptions.byId(id);
  if (!existing) throw new SubscriptionNotFoundError();

  const preferences = await ports.preferences.read();
  const now = ports.now();

  // Cancelling does NOT delete the pending pricing schedule: nothing fires it
  // automatically any more, and keeping the rows is what lets renew restore
  // the real reversion price instead of stranding the user on the trial cost.
  const updated = await ports.subscriptions.update(
    id,
    withDerivedStatus(
      existing,
      cancel(
        toTransitionInput(existing),
        mode,
        now,
        preferences.preferredTimezone,
      ),
      now,
      preferences.preferredTimezone,
    ),
  );

  return buildSubscriptionDto(ports, updated);
};

/**
 * Un-cancel a cancelling/cancelled subscription.
 *
 * `paymentDate` re-anchors the billing cycle to the day the subscription
 * actually started again. Every future occurrence is projected FROM that
 * anchor, so renewing a long-dead monthly subscription without it would keep
 * billing on the old day-of-month and immediately project a payment that
 * already passed.
 *
 * It is optional because the two renewable states want different things: a
 * still-billing `cancelling` subscription never stopped, so moving its anchor
 * would shift a cycle that was never interrupted. Only an ENDED one is asked
 * for a date.
 */
export const renewSubscription = async (
  ports: Ports,
  id: string,
  paymentDate: string | null,
): Promise<SubscriptionDto> => {
  const existing = await ports.subscriptions.byId(id);
  if (!existing) throw new SubscriptionNotFoundError();

  const preferences = await ports.preferences.read();
  const now = ports.now();

  const updated = await ports.subscriptions.update(
    id,
    withDerivedStatus(
      existing,
      renew(toTransitionInput(existing), paymentDate, now),
      now,
      preferences.preferredTimezone,
    ),
  );

  return buildSubscriptionDto(ports, updated);
};

/**
 * Pause billing. Spend is skipped per occurrence from `pausedAt` until
 * `resumeAt` (exclusive); an omitted `resumeAt` pauses indefinitely.
 */
export const pauseSubscription = async (
  ports: Ports,
  id: string,
  resumeAt: string | null,
): Promise<SubscriptionDto> => {
  const existing = await ports.subscriptions.byId(id);
  if (!existing) throw new SubscriptionNotFoundError();

  // Loaded BEFORE the guard, not after: the guard and the DTO's `status` must
  // answer "is this paused" in the same calendar, or for a few hours around a
  // resume date the list advertises `pause` and this throws AlreadyPaused.
  const preferences = await ports.preferences.read();
  const now = ports.now();

  const patch = pause(
    toTransitionInput(existing),
    resumeAt,
    now,
    preferences.preferredTimezone,
  );
  if (!patch) throw new AlreadyPausedError();

  const updated = await ports.subscriptions.update(
    id,
    withDerivedStatus(existing, patch, now, preferences.preferredTimezone),
  );

  return buildSubscriptionDto(ports, updated);
};

/**
 * Resume billing: clear the pause and roll `paymentDate` forward to the next
 * occurrence in the future. Without the roll-forward the anchor still points at
 * a date inside the pause and the dashboard shows a charge that never happened.
 */
export const resumeSubscription = async (
  ports: Ports,
  id: string,
): Promise<SubscriptionDto> => {
  const existing = await ports.subscriptions.byId(id);
  if (!existing) throw new SubscriptionNotFoundError();

  // Before the guard, for the same reason as `pauseSubscription`.
  const preferences = await ports.preferences.read();
  const now = ports.now();

  const patch = resume(
    toTransitionInput(existing),
    now,
    preferences.preferredTimezone,
  );
  if (!patch) throw new NotPausedError();

  const updated = await ports.subscriptions.update(
    id,
    withDerivedStatus(existing, patch, now, preferences.preferredTimezone),
  );

  return buildSubscriptionDto(ports, updated);
};

const assertCategoryExists = async (
  ports: Ports,
  categoryId: string | null | undefined,
): Promise<void> => {
  if (categoryId === undefined || categoryId === null) return;
  if (!(await ports.categories.byId(categoryId))) {
    throw new SubscriptionCategoryNotFoundError();
  }
};

/** The record as the pure transitions read it. */
const toTransitionInput = (record: SubscriptionRecord): TransitionInput => ({
  paymentDate: record.paymentDate,
  every: record.every,
  period: record.period,
  willBeCancelledAt: record.willBeCancelledAt,
  pausedAt: record.pausedAt,
  resumeAt: record.resumeAt,
});

/**
 * A transition patch, plus the status the row's date columns say it has once
 * the patch lands. Every lifecycle guard reads the derived status rather than
 * the stored column, which is a cache the client never sees — a dated pause
 * whose `resumeAt` has elapsed reads `active` everywhere while the column still
 * says `paused`, and a guard on the column refuses an action the same row
 * advertises in `allowedActions`.
 *
 * `now` is the same instant the transition ran against. Read twice, a clock
 * that crosses midnight in between decides the patch on one calendar day and
 * the status column on the next.
 */
const withDerivedStatus = (
  record: SubscriptionRecord,
  patch: TransitionPatch,
  now: Date,
  timezone: string,
): Partial<SubscriptionRecord> => ({
  ...patch,
  status: deriveSubscriptionStatus({ ...record, ...patch }, now, timezone),
});

const toUpdatePatch = (
  input: UpdateSubscriptionInput,
): Partial<SubscriptionRecord> => {
  const { cost, paymentDate, willBeCancelledAt, ...rest } = input;
  const patch: Partial<SubscriptionRecord> = { ...rest };

  if (cost !== undefined) patch.cost = normalizeAmount(cost);
  if (paymentDate !== undefined) {
    patch.paymentDate = new Date(paymentDate).toISOString();
  }
  // Keyed on presence, not on value: an update that does not mention the
  // cancellation must leave it alone, and `willBeCancelledAt: null` means
  // "un-cancel".
  if (willBeCancelledAt !== undefined) {
    patch.willBeCancelledAt = toIso(willBeCancelledAt);
  }

  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );
};

const isDirectPriceChange = (
  record: SubscriptionRecord,
  input: UpdateSubscriptionInput,
): boolean => {
  if (input.cost === undefined && input.currency === undefined) return false;

  const existingCost = Number(record.cost);
  const nextCost = input.cost ?? existingCost;

  return (
    normalizeAmount(nextCost) !== normalizeAmount(existingCost) ||
    (input.currency ?? record.currency) !== record.currency
  );
};

const toIso = (value?: string | null): string | null =>
  value ? new Date(value).toISOString() : null;
