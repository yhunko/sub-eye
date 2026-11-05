/**
 * The 2026 price-rise log, one entry per plan.
 *
 * Every figure was read on the service's own pricing page, its own
 * announcement, or an Internet Archive capture of that pricing page — never a
 * news roundup. Next month's update is one more entry, read the same way.
 *
 * `onPricingPage` is the first archived capture of the service's own US
 * pricing page that shows the new price. It is an upper bound, not a stated
 * date: Netflix and YouTube published none, so for them it is the only date
 * there is, and the page says so.
 */

export type SourceKind =
  | "announcement"
  | "pricingPage"
  | "archivedBefore"
  | "archivedAfter";

export type PriceRise = {
  service: string;
  plan: string;
  storefront: "us";
  currency: "usd";
  from: number;
  to: number;
  /** ISO day of the service's own announcement, when it made one. */
  announced?: string;
  /** ISO day of the first archived capture of its own page showing `to`. */
  onPricingPage: string;
  /** When existing members pay `to`, as the service stated it. */
  existing?: { after: string } | { month: string };
  sources: { kind: SourceKind; url: string }[];
  /** ISO day every source above was last read. */
  read: string;
};

const READ = "2026-11-05";

const netflix = {
  pricingPage: "https://help.netflix.com/en/node/24926/us",
  before:
    "https://web.archive.org/web/20260225172251/https://help.netflix.com/en/node/24926/us",
  after:
    "https://web.archive.org/web/20260326233800/https://help.netflix.com/en/node/24926/us",
};

const crunchyroll = {
  announcement:
    "https://www.crunchyroll.com/news/announcements/2026/2/2/crunchyroll-updates-membership-pricing-to-give-fans-more-of-what-they-love",
  after:
    "https://web.archive.org/web/20260208091006/https://www.crunchyroll.com/premium",
};

const crunchyrollTier = (
  plan: string,
  from: number,
  to: number,
): PriceRise => ({
  service: "Crunchyroll",
  plan,
  storefront: "us",
  currency: "usd",
  from,
  to,
  announced: "2026-02-02",
  onPricingPage: "2026-02-08",
  existing: { after: "2026-03-04" },
  sources: [
    { kind: "announcement", url: crunchyroll.announcement },
    { kind: "archivedAfter", url: crunchyroll.after },
  ],
  read: READ,
});

const netflixPlan = (plan: string, from: number, to: number): PriceRise => ({
  service: "Netflix",
  plan,
  storefront: "us",
  currency: "usd",
  from,
  to,
  onPricingPage: "2026-03-26",
  sources: [
    { kind: "pricingPage", url: netflix.pricingPage },
    { kind: "archivedBefore", url: netflix.before },
    { kind: "archivedAfter", url: netflix.after },
  ],
  read: READ,
});

export const priceRises: PriceRise[] = [
  {
    service: "Spotify",
    plan: "Premium Individual",
    storefront: "us",
    currency: "usd",
    from: 11.99,
    to: 12.99,
    announced: "2026-01-15",
    onPricingPage: "2026-01-16",
    existing: { month: "2026-02" },
    sources: [
      {
        kind: "announcement",
        url: "https://newsroom.spotify.com/2026-01-15/premium-pricing-update/",
      },
      { kind: "pricingPage", url: "https://www.spotify.com/us/premium/" },
      {
        kind: "archivedBefore",
        url: "https://web.archive.org/web/20260114154731/https://www.spotify.com/us/premium/",
      },
    ],
    read: READ,
  },
  crunchyrollTier("Fan", 7.99, 9.99),
  crunchyrollTier("Mega Fan", 11.99, 13.99),
  crunchyrollTier("Ultimate Fan", 15.99, 17.99),
  netflixPlan("Standard with ads", 7.99, 8.99),
  netflixPlan("Standard", 17.99, 19.99),
  netflixPlan("Premium", 24.99, 26.99),
  {
    service: "YouTube",
    plan: "Premium Individual",
    storefront: "us",
    currency: "usd",
    from: 13.99,
    to: 15.99,
    onPricingPage: "2026-04-09",
    sources: [
      {
        kind: "archivedBefore",
        url: "https://web.archive.org/web/20260409130613/https://www.youtube.com/premium",
      },
      {
        kind: "archivedAfter",
        url: "https://web.archive.org/web/20260409205314/https://www.youtube.com/premium",
      },
    ],
    read: READ,
  },
];

/** What the rise adds over twelve monthly payments, rounded to the cent. */
export const yearlyIncrease = (rise: Pick<PriceRise, "from" | "to">): number =>
  Math.round((rise.to - rise.from) * 12 * 100) / 100;

/** The rise as a share of the old price, to one decimal place. */
export const percentIncrease = (rise: Pick<PriceRise, "from" | "to">): number =>
  Math.round(((rise.to - rise.from) / rise.from) * 1000) / 10;
