import type { SubscriptionDto } from "@subeye/model";
import { SubscriptionNotFoundError } from "./errors";
import type { Ports } from "./ports";
import type { SubscriptionRecord } from "./records";
import { toSubscriptionDto } from "./toSubscriptionDto";

/** The DTO for a record already in hand, with everything it embeds loaded. */
export const buildSubscriptionDto = async (
  ports: Ports,
  record: SubscriptionRecord,
): Promise<SubscriptionDto> => {
  const preferences = await ports.preferences.read();
  const [rates, phases, category] = await Promise.all([
    ports.rates.forBase(preferences.preferredCurrency),
    ports.phases.bySubscription(record.id),
    record.categoryId ? ports.categories.byId(record.categoryId) : null,
  ]);

  return toSubscriptionDto(
    record,
    phases,
    preferences,
    rates,
    category
      ? { id: category.id, name: category.name, emoji: category.emoji }
      : null,
    ports.now(),
  );
};

/** Re-read a subscription and map it. Every mutation answers through this. */
export const loadSubscriptionDto = async (
  ports: Ports,
  id: string,
): Promise<SubscriptionDto> => {
  const record = await ports.subscriptions.byId(id);
  if (!record) throw new SubscriptionNotFoundError();
  return buildSubscriptionDto(ports, record);
};
