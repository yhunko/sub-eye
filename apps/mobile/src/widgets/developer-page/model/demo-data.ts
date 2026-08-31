import { SubscriptionPeriod } from "@subeye/model";
import type {
  CategoryRecord,
  PricePhaseRecord,
  SubscriptionRecord,
} from "@subeye/store";
import type { StoreDoc } from "@/shared/lib/store";

/**
 * The App Store capture set, as a store document.
 *
 * Every date is an OFFSET FROM `now`, never a literal — a fixed calendar would
 * drift into the past between one capture session and the next, and a hero
 * reading "renews 4 Mar" under a September screenshot is the kind of thing a
 * reviewer notices before a user does.
 *
 * The offsets are chosen so the five soonest events are five DIFFERENT kinds:
 * a charge, a trial ending, a yearly charge, a price rise and a resume, with a
 * cancellation sixth so the rail's cut-off card has something to show. Left to
 * chance the rail is five identical renewal cards, which is what the first
 * capture pass shipped.
 */
const MS_DAY = 86_400_000;

/**
 * `n` days from `base`, as that day's UTC midnight — the calendar-day form.
 *
 * Read off the LOCAL date parts, not the UTC ones. The app's "today" is the
 * device's calendar day, and west of UTC midnight the two disagree: seeding at
 * 02:00 in Kyiv put every offset one day early, and a card meant to say
 * "tomorrow" said "today".
 */
const day = (base: Date, offset: number): string =>
  new Date(
    Date.UTC(base.getFullYear(), base.getMonth(), base.getDate() + offset),
  ).toISOString();

/** An instant, for the columns that are instants (`createdAt`, `appliedAt`). */
const at = (base: Date, offset: number): string =>
  new Date(base.getTime() + offset * MS_DAY).toISOString();

/**
 * A past payment anchor whose next monthly occurrence lands `inDays` from now.
 *
 * Whole YEARS back, never months: `Date.UTC(y, m - 5, 31)` overflows into the
 * next month whenever that month is short, which silently moves the very
 * renewals this set is arranged around. Same month index a year earlier keeps
 * the day.
 */
const anchor = (base: Date, inDays: number, yearsBack: number): string => {
  const target = new Date(Date.parse(day(base, inDays)));
  return new Date(
    Date.UTC(
      target.getUTCFullYear() - yearsBack,
      target.getUTCMonth(),
      target.getUTCDate(),
    ),
  ).toISOString();
};

/**
 * Category names are the only strings in the seed a user would read in their
 * own language — every other one is a brand. The capture set therefore carries
 * both, keyed by the locale the screenshots are being taken in.
 */
const CATEGORIES: [id: string, emoji: string, en: string, uk: string][] = [
  ["cat-work", "💼", "Work", "Робота"],
  ["cat-entertainment", "🎬", "Entertainment", "Розваги"],
  ["cat-ai", "🤖", "AI", "ШІ"],
  ["cat-health", "💪", "Health", "Здоров'я"],
  ["cat-home", "🏠", "Home", "Дім"],
  ["cat-music", "🎧", "Music", "Музика"],
];

type Seed = {
  id: string;
  name: string;
  domain: string;
  cost: string;
  every?: number;
  period?: SubscriptionRecord["period"];
  category: string | null;
  /** Days from now to the next charge. */
  due: number;
  notes?: string;
};

const SUBSCRIPTIONS: Seed[] = [
  {
    id: "s-spotify",
    name: "Spotify",
    domain: "spotify.com",
    cost: "11.99",
    category: "cat-music",
    due: 1,
  },
  {
    id: "s-strava",
    name: "Strava",
    domain: "strava.com",
    cost: "0.00",
    category: "cat-health",
    due: 7,
  },
  {
    id: "s-amazon",
    name: "Amazon Prime",
    domain: "amazon.com",
    cost: "139.00",
    every: 1,
    period: SubscriptionPeriod.YEAR,
    category: "cat-home",
    due: 4,
  },
  {
    id: "s-adobe",
    name: "Adobe Creative Cloud",
    domain: "adobe.com",
    cost: "59.99",
    category: "cat-work",
    due: 12,
    notes:
      "Photography + Illustrator. Cancel before the renewal if the Figma trial works out.",
  },
  {
    id: "s-appleone",
    name: "Apple One",
    domain: "apple.com",
    cost: "19.95",
    category: "cat-entertainment",
    due: 17,
  },
  {
    id: "s-dropbox",
    name: "Dropbox",
    domain: "dropbox.com",
    cost: "11.99",
    category: "cat-work",
    due: 23,
  },
  {
    id: "s-netflix",
    name: "Netflix",
    domain: "netflix.com",
    cost: "15.49",
    category: "cat-entertainment",
    due: 20,
  },
  {
    id: "s-chatgpt",
    name: "ChatGPT Plus",
    domain: "openai.com",
    cost: "20.00",
    category: "cat-ai",
    due: 13,
  },
  {
    id: "s-claude",
    name: "Claude Pro",
    domain: "claude.ai",
    cost: "20.00",
    category: "cat-ai",
    due: 15,
  },
  {
    id: "s-icloud",
    name: "iCloud+ 2 TB",
    domain: "icloud.com",
    cost: "9.99",
    category: "cat-home",
    due: 8,
  },
  {
    id: "s-youtube",
    name: "YouTube Premium",
    domain: "youtube.com",
    cost: "13.99",
    category: "cat-entertainment",
    due: 16,
  },
  {
    id: "s-notion",
    name: "Notion",
    domain: "notion.so",
    cost: "10.00",
    category: "cat-work",
    due: 11,
  },
  {
    id: "s-figma",
    name: "Figma",
    domain: "figma.com",
    cost: "15.00",
    category: "cat-work",
    due: 24,
  },
  {
    id: "s-duolingo",
    name: "Duolingo Super",
    domain: "duolingo.com",
    cost: "6.99",
    category: "cat-health",
    due: 10,
  },
  {
    id: "s-disney",
    name: "Disney+",
    domain: "disneyplus.com",
    cost: "9.99",
    category: "cat-entertainment",
    due: 26,
  },
  {
    id: "s-copilot",
    name: "GitHub Copilot",
    domain: "github.com",
    cost: "10.00",
    category: "cat-work",
    due: 14,
  },
];

export function buildDemoDoc(
  now: Date,
  preferredCurrency = "usd",
  locale: "en" | "uk" = "en",
): StoreDoc {
  const categories: CategoryRecord[] = CATEGORIES.map(
    ([id, emoji, en, uk]) => ({
      id,
      name: locale === "uk" ? uk : en,
      emoji,
      createdAt: at(now, -240),
      updatedAt: at(now, -240),
    }),
  );

  const subscriptions: SubscriptionRecord[] = SUBSCRIPTIONS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    cost: seed.cost,
    currency: "usd",
    every: seed.every ?? 1,
    period: seed.period ?? SubscriptionPeriod.MONTH,
    status: "active",
    autoPaid: true,
    categoryId: seed.category,
    notes: seed.notes ?? null,
    brandDomain: seed.domain,
    paymentDate: anchor(now, seed.due, 2),
    willBeCancelledAt: null,
    pausedAt: null,
    resumeAt: null,
    createdAt: at(now, -400),
    updatedAt: at(now, -30),
  }));

  const find = (id: string) => {
    const record = subscriptions.find((s) => s.id === id);
    if (!record) throw new Error(`demo seed lost ${id}`);
    return record;
  };

  // Paused, resuming in 5 days. `pausedAt` is an instant, `resumeAt` a day.
  const appleOne = find("s-appleone");
  appleOne.status = "paused";
  appleOne.pausedAt = at(now, -18);
  appleOne.resumeAt = day(now, 5);

  // Cancelled but still inside the paid period — the row that stops costing
  // money on a date, which is the one attention event that is good news.
  const dropbox = find("s-dropbox");
  dropbox.status = "cancelling";
  dropbox.willBeCancelledAt = day(now, 6);

  const phases: PricePhaseRecord[] = [
    // Free trial, converting in 2 days.
    {
      id: "p-strava-trial",
      subscriptionId: "s-strava",
      kind: "trial",
      cost: "0.00",
      currency: "usd",
      startsAt: day(now, -28),
      endsAt: day(now, 2),
      appliedAt: at(now, -28),
      createdAt: at(now, -28),
      updatedAt: at(now, -28),
    },
    {
      id: "p-strava-standard",
      subscriptionId: "s-strava",
      kind: "standard",
      cost: "11.99",
      currency: "usd",
      startsAt: day(now, 2),
      endsAt: null,
      appliedAt: null,
      createdAt: at(now, -28),
      updatedAt: at(now, -28),
    },
    // Half-price introductory year, reverting in 10 days.
    {
      id: "p-duolingo-intro",
      subscriptionId: "s-duolingo",
      kind: "intro",
      cost: "6.99",
      currency: "usd",
      startsAt: day(now, -170),
      endsAt: day(now, 10),
      appliedAt: at(now, -170),
      createdAt: at(now, -170),
      updatedAt: at(now, -170),
    },
    {
      id: "p-duolingo-standard",
      subscriptionId: "s-duolingo",
      kind: "standard",
      cost: "12.99",
      currency: "usd",
      startsAt: day(now, 10),
      endsAt: null,
      appliedAt: null,
      createdAt: at(now, -170),
      updatedAt: at(now, -170),
    },
    // Two rises already taken and a third pending — the price history is the
    // whole argument for the app, and one lone SCHEDULED row does not make it.
    {
      id: "p-adobe-2024",
      subscriptionId: "s-adobe",
      kind: "standard",
      cost: "52.99",
      currency: "usd",
      startsAt: day(now, -690),
      endsAt: day(now, -320),
      appliedAt: at(now, -690),
      createdAt: at(now, -690),
      updatedAt: at(now, -690),
    },
    {
      id: "p-adobe-2025",
      subscriptionId: "s-adobe",
      kind: "standard",
      cost: "59.99",
      currency: "usd",
      startsAt: day(now, -320),
      endsAt: day(now, 3),
      appliedAt: at(now, -320),
      createdAt: at(now, -320),
      updatedAt: at(now, -320),
    },
    // The price rise the app exists to catch.
    {
      id: "p-adobe-rise",
      subscriptionId: "s-adobe",
      kind: "scheduledChange",
      cost: "64.99",
      currency: "usd",
      startsAt: day(now, 3),
      endsAt: null,
      appliedAt: null,
      createdAt: at(now, -9),
      updatedAt: at(now, -9),
    },
    {
      id: "p-netflix-2025",
      subscriptionId: "s-netflix",
      kind: "standard",
      cost: "11.99",
      currency: "usd",
      startsAt: day(now, -640),
      endsAt: day(now, -240),
      appliedAt: at(now, -640),
      createdAt: at(now, -640),
      updatedAt: at(now, -640),
    },
    {
      id: "p-netflix-now",
      subscriptionId: "s-netflix",
      kind: "standard",
      cost: "15.49",
      currency: "usd",
      startsAt: day(now, -240),
      endsAt: null,
      appliedAt: at(now, -240),
      createdAt: at(now, -240),
      updatedAt: at(now, -240),
    },
  ];

  return {
    v: 1,
    preferences: {
      preferredCurrency,
      preferredTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: "DD/MM/YYYY",
      locale: "en",
      theme: "system",
    },
    categories,
    subscriptions,
    phases,
  };
}
