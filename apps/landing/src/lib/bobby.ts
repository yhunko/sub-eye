/**
 * Bobby's US App Store listing, as read on `read`. Only what the listing
 * itself states: the page prints each fact "as of" this day, so a Bobby update
 * makes it dated, never false. Re-read the listing before changing anything.
 */
export const bobby = {
  read: "2026-11-05",
  listing:
    "https://apps.apple.com/us/app/bobby-track-subscriptions/id1059152023",
  developer: "Yummygum",
  version: "3.10.4",
  versionDate: "2025-12-09",
  rating: 4.7,
  ratingCount: "8K",
  minimumIOS: "14.0",
  inAppPurchases: [
    { name: "All-in-one Pack", usd: 1.99 },
    { name: "Unlock Subscription Limit", usd: 0.99 },
    { name: "All-in-one Pack v2", usd: 2.99 },
    { name: "Unlock Category Limit", usd: 0.99 },
    { name: "Security Pack", usd: 0.99 },
    { name: "Visual Pack", usd: 0.99 },
  ],
  /** The listing's Compatibility section; iPad is not among them. */
  compatibility: ["iPhone", "iPod touch", "Mac", "Apple Vision"],
  /** Neither the description nor the version notes mention widgets. */
  widgetsMentioned: false,
  /** "Unlock Subscription Limit" is sold, but the listing never states the number. */
  freeLimitStated: false,
} as const;

export const bobbyPriceRange = () => {
  const prices = bobby.inAppPurchases.map((item) => item.usd);
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

/** SubEye's own US listing, read the same day so the two columns compare like with like. */
export const subeyeListing = {
  version: "6.3.1",
  versionDate: "2026-11-05",
  minimumIOS: "16.4",
} as const;
