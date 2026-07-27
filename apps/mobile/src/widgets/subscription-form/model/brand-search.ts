import { queryOptions } from "@tanstack/react-query";
import { env } from "@/shared/config/env";

/** Only what the form stores. The API's `icon` is deliberately dropped — see below. */
export type BrandHit = { name: string; domain: string };

/**
 * The query goes in the PATH, so it has to be escaped: a user typing "AT&T" or
 * "a/b" would otherwise rewrite the route and 404.
 *
 * `c` is documented as required but the endpoint served full results without it
 * when this was probed (2026-07-27), so a build with no client id still
 * searches rather than shipping a dead screen. Do not lean on that: register an
 * id at developers.brandfetch.com — it is free and public by design, and the day
 * Brandfetch starts enforcing the parameter is the day this silently 4xxs.
 */
export function brandSearchUrl(query: string, clientId: string | null): string {
  const path = `https://api.brandfetch.io/v2/search/${encodeURIComponent(query)}`;
  return clientId ? `${path}?c=${encodeURIComponent(clientId)}` : path;
}

/**
 * A third party's JSON, so nothing here is trusted: a shape change must degrade
 * to an empty list, never to a crash on a screen the user opened to pick a logo.
 *
 * `icon` is discarded on purpose. Brandfetch's search icons are hotlink-only and
 * expire after 24h, and the app renders every logo through `BrandLogo` from the
 * domain alone — so the picker previews exactly what the list row will show.
 */
export function toBrandHits(payload: unknown): BrandHit[] {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((entry: unknown) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { name, domain } = entry as Partial<BrandHit>;
    if (typeof domain !== "string" || domain.length === 0) return [];
    return [{ name: typeof name === "string" && name ? name : domain, domain }];
  });
}

/**
 * What the picker shows before anything is typed, so the screen is never a
 * search bar over nothing. Hardcoded because Brandfetch has no "popular"
 * endpoint and this answer barely moves — and because the most common
 * subscription in the app should be one tap from opening the form, not a
 * round-trip.
 *
 * Names are proper nouns and stay untranslated. Every domain here was checked
 * to resolve to a real favicon rather than the endpoint's generic globe; verify
 * a replacement the same way before adding it.
 */
export const POPULAR_BRANDS: BrandHit[] = [
  { name: "Netflix", domain: "netflix.com" },
  { name: "Spotify", domain: "spotify.com" },
  { name: "YouTube", domain: "youtube.com" },
  { name: "iCloud", domain: "icloud.com" },
  { name: "Apple Music", domain: "music.apple.com" },
  { name: "Amazon Prime", domain: "amazon.com" },
  { name: "Disney+", domain: "disneyplus.com" },
  { name: "HBO Max", domain: "max.com" },
  { name: "Google One", domain: "one.google.com" },
  { name: "Microsoft 365", domain: "microsoft.com" },
  { name: "Adobe", domain: "adobe.com" },
  { name: "ChatGPT", domain: "openai.com" },
  { name: "Claude", domain: "claude.ai" },
  { name: "GitHub", domain: "github.com" },
  { name: "Dropbox", domain: "dropbox.com" },
  { name: "Notion", domain: "notion.so" },
  { name: "Figma", domain: "figma.com" },
  { name: "Telegram", domain: "telegram.org" },
  { name: "PlayStation Plus", domain: "playstation.com" },
  { name: "Xbox Game Pass", domain: "xbox.com" },
];

export function brandSearchQuery(query: string) {
  return queryOptions({
    queryKey: ["brand-search", query],
    // TanStack's own signal is the cancellation story: when the debounced needle
    // moves on, the in-flight request for the old one is aborted.
    queryFn: async ({ signal }): Promise<BrandHit[]> => {
      const url = brandSearchUrl(query, env.BRANDFETCH_CLIENT_ID);
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`Brandfetch search failed: ${response.status}`);
      }
      return toBrandHits(await response.json());
    },
    // Two characters is where a name starts being a name. Below that every
    // keystroke is a request that returns the whole alphabet's worth of brands.
    enabled: query.length >= 2,
    // Brandfetch allows 200 requests per 5 minutes per IP, so a needle the user
    // backspaces into again must come from the cache, not the network.
    staleTime: 5 * 60 * 1000,
    // A logo is decorative and the screen already offers typing the domain by
    // hand, so a failed lookup is a dead end to show once, not to retry into.
    retry: false,
    // Keeps these out of the MMKV-persisted cache: Brandfetch's terms say the
    // data is fetched live and not persisted, and the query key is whatever the
    // user typed. `shared/lib/query.ts` reads this flag.
    meta: { persist: false },
  });
}
