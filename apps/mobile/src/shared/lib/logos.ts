import { createMMKV } from "react-native-mmkv";
import { env } from "@/shared/config/env";

/**
 * The bytes of every brand mark the app has drawn, as data URIs on their own
 * MMKV instance.
 *
 * The app used to hand `Image` a remote URL and let the platform's HTTP cache
 * decide. That cache is a shared, evictable, best-effort thing — the CDN's own
 * `max-age` is 24h, and even a hit is an async trip through the networking
 * stack — so a cold start drew empty circles that filled in a beat later, every
 * launch. Owning the bytes is the only way to promise otherwise: an MMKV read
 * is synchronous, so a cached logo is in hand during the first render.
 *
 * Its own instance rather than a key in the store document: a subscription
 * write must not re-serialise a megabyte of logos. It IS derived from the
 * user's list — which brands they pay for — so unlike the FX table it is
 * cleared by "Erase all data".
 */
const mmkv = createMMKV({ id: "subeye.logos" });

/**
 * Which shape of image a call site needs.
 *
 * `symbol` is the avatar's ladder: a bare mark, preferred, falling back to a
 * plate. `plate` is the opaque square the detail banner blurs into a colour
 * wash — a transparent symbol blurs to almost nothing, so that screen must ask
 * for the plate specifically.
 */
export type LogoKind = "symbol" | "plate";

/**
 * A cached answer. `uri` is `null` for "this brand has no logo anywhere", which
 * is a real answer worth keeping — it is what stops three 404s per mount.
 */
export type LogoEntry = {
  uri: string | null;
  /** Whether the mark arrived on its own opaque square. Drives the inset. */
  plate: boolean;
  /** When this was fetched. */
  at: number;
};

/**
 * ONE source size per kind, not one per view size.
 *
 * Every call site used to ask for its own pixel size — 84, 108, 114, 120 and
 * 162 on a 3x screen — so one brand meant five URLs, five cache entries and
 * five downloads. A single generous size is one entry every avatar draws from,
 * and 256 covers the largest (54 pt) even on a 4x screen, for 3–6 KB.
 */
const SYMBOL_PX = 256;

/**
 * The banner blurs this into a colour wash, and `blurRadius` blurs the SOURCE
 * at its natural size: halve the source and the same radius averages the mark
 * into the flat grey the tuning comment there warns about. 768 is what a 3x
 * screen was already asking for.
 */
const PLATE_PX = 768;

/**
 * How long a stored logo stands before it is refreshed IN THE BACKGROUND.
 *
 * A logo is not news. Brands redraw their mark every few years, so a week is
 * generous and still catches a rebrand without the user ever seeing a load: the
 * cached bytes render, the refresh lands after them, and the picture only
 * changes if the CDN's did.
 */
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How long "this brand has no logo" stands.
 *
 * Much shorter than a hit, because it is a fact about the CDN rather than about
 * the brand — a company whose light symbol appears next week should get it. Six
 * hours costs at most one wasted walk per brand per session.
 */
const MISS_MS = 6 * 60 * 60 * 1000;

/**
 * How long a FAILED walk (offline, timeout) suppresses another for the same
 * key. In memory only: a network failure must not be written to disk, or a
 * flight would pin a brand to the letter tile for six hours after landing.
 *
 * The calendar is why this exists at all — it draws the same brand in a day
 * tile and again in the agenda, and the month pager remounts both on every
 * swipe.
 */
const RETRY_MS = 60 * 1000;

/** RN's fetch has no default timeout, and a captive portal never answers. */
const FETCH_TIMEOUT_MS = 8000;

/**
 * ponytail: a cache this small is not worth an LRU. The picker draws a logo for
 * every search result, so the key count grows with browsing rather than with
 * the user's list; at ~5 KB an entry this ceiling is ~2.5 MB, and hitting it
 * costs one round of refetching. Per-entry eviction if that ever bites.
 */
const MAX_ENTRIES = 500;

/**
 * Every source we will try for one domain, best first.
 *
 * `fallback/404` on the Brandfetch ones is deliberate: the default is
 * Brandfetch's own wordmark, which would put another company's logo on the
 * user's row. A 404 moves us down this list instead.
 *
 * The order is empirical, and the reason the symbol ladder has three entries is
 * that no single one covers every brand:
 *  - `symbol/theme/light` is the pale-ink variant, the only one that is legible
 *    on this app's near-black plate — but it 404s for brands that never stored
 *    one (netflix).
 *  - `symbol` unpinned serves whatever variant a brand does have. Correct for
 *    colourful marks, and the reason monochrome ones must try `light` first:
 *    unpinned, OpenAI comes back near-black on near-black.
 *  - `icon` is the social-profile square. Lowest fidelity of the three and
 *    plate-shaped, but it is the only tier that covers icloud.com.
 */
function sourcesFor(
  kind: LogoKind,
  domain: string,
): [{ uri: string; plate: boolean }, ...{ uri: string; plate: boolean }[]] {
  const encoded = encodeURIComponent(domain);
  const client = env.BRANDFETCH_CLIENT_ID;

  // Google's favicon endpoint serves discrete sizes and 256 is the largest.
  if (!client) {
    return [
      {
        uri: `https://www.google.com/s2/favicons?domain=${encoded}&sz=256`,
        plate: true,
      },
    ];
  }

  const px = kind === "plate" ? PLATE_PX : SYMBOL_PX;
  const bf = (path: string) =>
    `https://cdn.brandfetch.io/${encoded}/${path}/fallback/404/h/${px}/w/${px}?c=${client}`;

  if (kind === "plate") return [{ uri: bf("icon"), plate: true }];

  return [
    { uri: bf("symbol/theme/light"), plate: false },
    { uri: bf("symbol"), plate: false },
    { uri: bf("icon"), plate: true },
  ];
}

const keyFor = (kind: LogoKind, domain: string) => `${kind}:${domain}`;

/**
 * Parsed entries, in front of MMKV.
 *
 * Not a second source of truth — it holds exactly what is on disk. It exists
 * because the read happens during render and a month grid asks for the same
 * brand a dozen times: without it every one of those is a `JSON.parse` of a
 * base64 string.
 */
const parsed = new Map<string, LogoEntry>();

const isEntry = (value: unknown): value is LogoEntry => {
  const entry = value as LogoEntry | null;
  return (
    typeof entry?.at === "number" &&
    typeof entry.plate === "boolean" &&
    (entry.uri === null || typeof entry.uri === "string")
  );
};

/**
 * What is cached for this brand, or `null` for "never fetched". Synchronous —
 * the whole point of the cache is that a render can ask.
 */
export function readLogo(kind: LogoKind, domain: string): LogoEntry | null {
  const key = keyFor(kind, domain);
  const hit = parsed.get(key);
  if (hit) return hit;

  const raw = mmkv.getString(key);
  if (!raw) return null;

  try {
    const entry: unknown = JSON.parse(raw);
    if (!isEntry(entry)) return null;
    parsed.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

/** Whether a cached entry is due a background refresh. */
export const logoIsStale = (entry: LogoEntry, now = Date.now()): boolean =>
  now - entry.at > (entry.uri ? FRESH_MS : MISS_MS);

function writeLogo(key: string, entry: LogoEntry): LogoEntry {
  if (!parsed.has(key) && mmkv.getAllKeys().length >= MAX_ENTRIES) {
    mmkv.clearAll();
    mmkv.trim();
    parsed.clear();
  }
  parsed.set(key, entry);
  mmkv.set(key, JSON.stringify(entry));
  return entry;
}

/** Resolves to the data URI, or `null` for a source that answered "not here". */
async function download(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    // Brandfetch gates on User-Agent and answers a browser-ish one with 380 KB
    // of HTML under a 200. Storing that as a logo would poison the entry for a
    // week; every real hit is an `image/*`.
    if (!(response.headers.get("content-type") ?? "").startsWith("image/")) {
      return null;
    }
    return await toDataUri(await response.blob());
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The one native hop. RN implements `readAsDataURL` and hands back exactly the
 * `data:image/webp;base64,…` string `Image` wants — there is no way to get at
 * response bytes as base64 in RN that is shorter than this.
 */
const toDataUri = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("logo read"));
    reader.readAsDataURL(blob);
  });

const inFlight = new Map<string, Promise<LogoEntry | null>>();
const attemptedAt = new Map<string, number>();

async function walk(
  kind: LogoKind,
  domain: string,
  key: string,
): Promise<LogoEntry | null> {
  // A 404 from every tier is an answer worth caching; a throw is not, and must
  // not be recorded as one.
  let answered = true;

  for (const source of sourcesFor(kind, domain)) {
    try {
      const uri = await download(source.uri);
      if (uri) {
        return writeLogo(key, { uri, plate: source.plate, at: Date.now() });
      }
    } catch {
      answered = false;
    }
  }

  return answered
    ? writeLogo(key, { uri: null, plate: false, at: Date.now() })
    : null;
}

/**
 * Fetch this brand's logo into the cache, walking the ladder until a source
 * serves an image.
 *
 * Never throws and never blocks a render: callers keep drawing whatever
 * `readLogo` already gave them and swap only once this resolves with something
 * new. Resolves `null` when nothing was learned — every tier failed on the
 * network, or another attempt is already in flight or too recent.
 *
 * Deduplicated per key rather than notified globally: a dozen rows of the same
 * brand share one walk and each re-renders itself off the same promise. An
 * earlier version pushed advances out to every mounted logo and several brands
 * stopped resolving at all.
 */
export function loadLogo(
  kind: LogoKind,
  domain: string,
): Promise<LogoEntry | null> {
  const key = keyFor(kind, domain);
  const running = inFlight.get(key);
  if (running) return running;

  const now = Date.now();
  if (now - (attemptedAt.get(key) ?? 0) < RETRY_MS)
    return Promise.resolve(null);
  attemptedAt.set(key, now);

  const run = walk(kind, domain, key).finally(() => inFlight.delete(key));
  inFlight.set(key, run);
  return run;
}

/**
 * Drop every cached logo. Part of "Erase all data": the keys are the domains of
 * the brands the user tracked, so what is left behind names their list even
 * after the document is gone.
 */
export function clearLogos(): void {
  mmkv.clearAll();
  // `clearAll` tombstones; MMKV appends to an mmap file and never shrinks it on
  // its own, and Documents travels into device backups. Same reasoning as
  // eraseDoc.
  mmkv.trim();
  parsed.clear();
  attemptedAt.clear();
}
