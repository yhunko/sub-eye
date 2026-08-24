import type { Ports } from "@subeye/store";
import * as Crypto from "expo-crypto";
import { readDoc, type StoreDoc, writeDoc } from "./document";
import { ratesPort } from "./fx";

/**
 * Read-modify-write of the whole document, which is every mutation here.
 *
 * A throw inside `change` never reaches `writeDoc`, so a rejected write leaves
 * the store exactly as it was.
 */
const mutate = <T>(change: (doc: StoreDoc) => T): T => {
  const doc = readDoc();
  const result = change(doc);
  writeDoc(doc);
  return result;
};

export const localPorts: Ports = {
  now: () => new Date(),
  newId: () => Crypto.randomUUID(),

  rates: ratesPort,

  preferences: {
    read: async () => readDoc().preferences,
    write: async (patch) =>
      mutate((doc) => {
        doc.preferences = { ...doc.preferences, ...patch };
        return doc.preferences;
      }),
  },

  subscriptions: {
    all: async () => readDoc().subscriptions,
    byId: async (id) =>
      readDoc().subscriptions.find((s) => s.id === id) ?? null,
    create: async (record) =>
      mutate((doc) => {
        doc.subscriptions.push(record);
        return record;
      }),
    update: async (id, patch) =>
      mutate((doc) => {
        const index = doc.subscriptions.findIndex((s) => s.id === id);
        const existing = doc.subscriptions[index];
        if (!existing) throw new Error(`no subscription ${id}`);

        const next = { ...existing, ...patch };
        doc.subscriptions[index] = next;
        return next;
      }),
    remove: async (id) =>
      mutate((doc) => {
        doc.subscriptions = doc.subscriptions.filter((s) => s.id !== id);
        // ON DELETE CASCADE, which Postgres did for us. Without it the store
        // leaks orphan phases and the pricing timeline reads them back against
        // a subscription that is gone.
        doc.phases = doc.phases.filter((p) => p.subscriptionId !== id);
      }),
  },

  categories: {
    all: async () => readDoc().categories,
    byId: async (id) => readDoc().categories.find((c) => c.id === id) ?? null,
    create: async (record) =>
      mutate((doc) => {
        doc.categories.push(record);
        return record;
      }),
    update: async (id, patch) =>
      mutate((doc) => {
        const index = doc.categories.findIndex((c) => c.id === id);
        const existing = doc.categories[index];
        if (!existing) throw new Error(`no category ${id}`);

        const next = { ...existing, ...patch };
        doc.categories[index] = next;
        return next;
      }),
    remove: async (id) =>
      mutate((doc) => {
        doc.categories = doc.categories.filter((c) => c.id !== id);
        // ON DELETE SET NULL, NOT cascade. The delete-confirmation copy counts
        // exactly these subscriptions before the delete, so they have to
        // outlive the category.
        doc.subscriptions = doc.subscriptions.map((s) =>
          s.categoryId === id ? { ...s, categoryId: null } : s,
        );
      }),
  },

  phases: {
    all: async () => readDoc().phases,
    bySubscription: async (subscriptionId) =>
      readDoc().phases.filter((p) => p.subscriptionId === subscriptionId),
    replaceAll: async (subscriptionId, records) =>
      mutate((doc) => {
        doc.phases = [
          ...doc.phases.filter((p) => p.subscriptionId !== subscriptionId),
          ...records,
        ];
      }),
    applyBoundary: async (args) =>
      mutate((doc) => {
        doc.phases = doc.phases.map((phase) => {
          if (phase.id === args.phaseId) {
            return {
              ...phase,
              appliedAt: args.appliedAt,
              startsAt: args.startsAt,
            };
          }
          if (phase.id === args.precedingPhaseId) {
            return { ...phase, endsAt: args.startsAt };
          }
          return phase;
        });
        doc.subscriptions = doc.subscriptions.map((s) =>
          s.id === args.subscriptionId
            ? { ...s, cost: args.cost, currency: args.currency }
            : s,
        );
      }),
    remove: async (id) =>
      mutate((doc) => {
        doc.phases = doc.phases.filter((p) => p.id !== id);
      }),
  },
};
